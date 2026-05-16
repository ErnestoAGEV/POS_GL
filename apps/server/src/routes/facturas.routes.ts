import { FastifyInstance } from "fastify";
import { eq, desc, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  generateCfdiXml,
  timbrarCfdi,
  cancelarCfdi,
  type CfdiData,
} from "../services/cfdi.service.js";
import { generateInvoiceHtml } from "../services/cfdi-pdf.service.js";

export async function facturasRoutes(app: FastifyInstance) {
  // POST /facturas — create invoice with CFDI XML generation
  app.post<{
    Body: {
      ventaIds: number[];
      clienteId: number;
      tipo: "individual" | "global" | "nota_credito" | "complemento";
      total: number;
    };
  }>("/facturas", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { ventaIds, clienteId, tipo, total } = request.body;

      if (!ventaIds || ventaIds.length === 0) {
        return reply
          .status(400)
          .send({ error: "Se requiere al menos una venta" });
      }

      // Get client
      const cliente = await db
        .select()
        .from(schema.clientes)
        .where(eq(schema.clientes.id, clienteId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!cliente) {
        return reply.status(404).send({ error: "Cliente no encontrado" });
      }

      // Get sale details for concepts
      const ventas = await db
        .select()
        .from(schema.ventas)
        .where(
          sql`${schema.ventas.id} IN (${sql.join(
            ventaIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );

      const ventaIdNums = ventas.map((v) => v.id);
      const detalles =
        ventaIdNums.length > 0
          ? await db
              .select()
              .from(schema.ventaDetalles)
              .where(
                sql`${schema.ventaDetalles.ventaId} IN (${sql.join(
                  ventaIdNums.map((id) => sql`${id}`),
                  sql`, `
                )})`
              )
          : [];

      // Get product info for concepts
      const productIds = [...new Set(detalles.map((d) => d.productoId))];
      const productos =
        productIds.length > 0
          ? await db
              .select()
              .from(schema.productos)
              .where(
                sql`${schema.productos.id} IN (${sql.join(
                  productIds.map((id) => sql`${id}`),
                  sql`, `
                )})`
              )
          : [];
      const productMap = new Map(productos.map((p) => [p.id, p]));

      // Get emisor info from sucursal (first sale's terminal -> sucursal)
      let emisor = { rfc: "XAXX010101000", nombre: "POSGL Empresa", regimenFiscal: "601" };
      if (ventas.length > 0) {
        const [terminal] = await db
          .select()
          .from(schema.terminales)
          .where(eq(schema.terminales.id, ventas[0].terminalId))
          .limit(1);
        if (terminal) {
          const [sucursal] = await db
            .select()
            .from(schema.sucursales)
            .where(eq(schema.sucursales.id, terminal.sucursalId))
            .limit(1);
          if (sucursal) {
            emisor = {
              rfc: sucursal.rfc || "XAXX010101000",
              nombre: sucursal.razonSocial || sucursal.nombre,
              regimenFiscal: sucursal.regimenFiscal || "601",
            };
          }
        }
      }

      // Get payment methods from sales
      const pagos =
        ventaIdNums.length > 0
          ? await db
              .select()
              .from(schema.pagos)
              .where(
                sql`${schema.pagos.ventaId} IN (${sql.join(
                  ventaIdNums.map((id) => sql`${id}`),
                  sql`, `
                )})`
              )
          : [];

      // Map forma de pago to SAT codes
      const formaPagoMap: Record<string, string> = {
        efectivo: "01",
        tarjeta: "04",
        transferencia: "03",
        credito: "99",
        vale_despensa: "08",
        tarjeta_regalo: "05",
      };
      const primaryPago = pagos.length > 0 ? pagos[0].formaPago : "efectivo";
      const formaPagoSat = formaPagoMap[primaryPago] || "99";

      const folio = `${Date.now().toString(36).toUpperCase()}`;
      const subtotal = ventas.reduce((s, v) => s + v.subtotal, 0);
      const descuento = ventas.reduce((s, v) => s + v.descuento, 0);

      // Build CFDI data
      const cfdiData: CfdiData = {
        serie: "A",
        folio,
        fecha: new Date().toISOString().replace(/\.\d{3}Z$/, ""),
        formaPago: formaPagoSat,
        metodoPago: "PUE",
        tipoDeComprobante: tipo === "nota_credito" ? "E" : "I",
        moneda: "MXN",
        tipoCambio: "1",
        lugarExpedicion: emisor.rfc === "XAXX010101000" ? "06600" : "06600",
        subtotal,
        descuento,
        total,
        emisor,
        receptor: {
          rfc: cliente.rfc || "XAXX010101000",
          nombre: cliente.razonSocial || cliente.nombre,
          usoCfdi: cliente.usoCfdi || "G03",
          domicilioFiscal: cliente.domicilioFiscal || "06600",
          regimenFiscal: cliente.regimenFiscal || "616",
        },
        conceptos: detalles.map((d) => {
          const prod = productMap.get(d.productoId);
          return {
            claveProdServ: prod?.claveSat || "01010101",
            cantidad: d.cantidad,
            claveUnidad: prod?.unidadSat || "H87",
            unidad: "Pieza",
            descripcion: prod?.nombre || "Producto",
            valorUnitario: d.precioUnitario,
            importe: d.precioUnitario * d.cantidad,
            descuento: d.descuento,
            tasaIva: prod?.tasaIva ?? 0.16,
          };
        }),
      };

      // Generate and timbrar XML
      const xmlPreTimbrado = generateCfdiXml(cfdiData);
      const timbrado = await timbrarCfdi(xmlPreTimbrado);

      // Generate HTML representation (PDF stub)
      const iva = ventas.reduce((s, v) => s + v.iva, 0);
      const htmlPdf = generateInvoiceHtml({
        uuid: timbrado.uuid,
        serie: "A",
        folio,
        fecha: cfdiData.fecha,
        emisor,
        receptor: cfdiData.receptor,
        conceptos: cfdiData.conceptos.map((c) => ({
          descripcion: c.descripcion,
          cantidad: c.cantidad,
          claveUnidad: c.claveUnidad,
          valorUnitario: c.valorUnitario,
          importe: c.importe,
          descuento: c.descuento,
        })),
        subtotal,
        descuento,
        iva,
        total,
        formaPago: formaPagoSat,
        metodoPago: "PUE",
        selloSat: timbrado.selloSat,
        noCertificadoSat: timbrado.noCertificadoSat,
        cadenaOriginal: `||1.1|${timbrado.uuid}|${timbrado.fechaTimbrado}||`,
      });

      // Store in database
      const [factura] = await db
        .insert(schema.facturas)
        .values({
          ventaIds: JSON.stringify(ventaIds),
          clienteId,
          uuidFiscal: timbrado.uuid,
          xml: timbrado.xml,
          pdf: htmlPdf,
          tipo,
          estado: "timbrada",
          serieSat: "A",
          folioSat: `A-${folio}`,
          total,
        })
        .returning();

      return factura;
    },
  });

  // GET /facturas — list with pagination
  app.get<{
    Querystring: { page?: string; limit?: string; tipo?: string; estado?: string };
  }>("/facturas", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const rows = await db
        .select()
        .from(schema.facturas)
        .orderBy(desc(schema.facturas.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /facturas/:id
  app.get<{ Params: { id: string } }>("/facturas/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const factura = await db
        .select()
        .from(schema.facturas)
        .where(eq(schema.facturas.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!factura) {
        return reply.status(404).send({ error: "Not Found" });
      }

      let cliente = null;
      if (factura.clienteId) {
        cliente = await db
          .select()
          .from(schema.clientes)
          .where(eq(schema.clientes.id, factura.clienteId))
          .limit(1)
          .then((rows) => rows[0]);
      }

      return { ...factura, cliente };
    },
  });

  // GET /facturas/:id/xml — download XML
  app.get<{ Params: { id: string } }>("/facturas/:id/xml", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const factura = await db
        .select({ xml: schema.facturas.xml, folioSat: schema.facturas.folioSat })
        .from(schema.facturas)
        .where(eq(schema.facturas.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!factura?.xml) {
        return reply.status(404).send({ error: "XML not found" });
      }

      return reply
        .header("Content-Type", "application/xml")
        .header(
          "Content-Disposition",
          `attachment; filename="${factura.folioSat || "factura"}.xml"`
        )
        .send(factura.xml);
    },
  });

  // GET /facturas/:id/pdf — download PDF (HTML representation)
  app.get<{ Params: { id: string } }>("/facturas/:id/pdf", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const factura = await db
        .select({ pdf: schema.facturas.pdf, folioSat: schema.facturas.folioSat })
        .from(schema.facturas)
        .where(eq(schema.facturas.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!factura?.pdf) {
        return reply.status(404).send({ error: "PDF not found" });
      }

      // Returns HTML representation — in production, convert to actual PDF
      return reply
        .header("Content-Type", "text/html")
        .header(
          "Content-Disposition",
          `inline; filename="${factura.folioSat || "factura"}.html"`
        )
        .send(factura.pdf);
    },
  });

  // PUT /facturas/:id/cancelar — cancel invoice
  app.put<{
    Params: { id: string };
    Body: { motivo?: string };
  }>("/facturas/:id/cancelar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const factura = await db
        .select()
        .from(schema.facturas)
        .where(eq(schema.facturas.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!factura) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (factura.estado === "cancelada") {
        return reply
          .status(400)
          .send({ error: "La factura ya esta cancelada" });
      }

      // Call PAC cancellation (stub)
      const motivo = request.body.motivo || "02";
      await cancelarCfdi(
        factura.uuidFiscal || "",
        "XAXX010101000",
        motivo
      );

      await db
        .update(schema.facturas)
        .set({ estado: "cancelada" })
        .where(eq(schema.facturas.id, id));

      return { status: "cancelada" };
    },
  });
}
