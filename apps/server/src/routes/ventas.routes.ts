import { FastifyInstance } from "fastify";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { createVentaSchema } from "../schemas/validation.js";
import { validateBody } from "../utils/validate.js";
import { logAudit } from "../utils/audit.js";

export async function ventasRoutes(app: FastifyInstance) {
  // POST /ventas — receive a sale from a terminal
  app.post<{
    Body: {
      folio: string;
      terminalId: number;
      usuarioId: number;
      clienteId?: number;
      subtotal: number;
      descuento: number;
      iva: number;
      total: number;
      tipo: string;
      estado: string;
      fecha: string;
      syncId: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
        precioUnitario: number;
        descuento: number;
        subtotal: number;
        syncId: string;
      }>;
      pagos: Array<{
        formaPago: string;
        monto: number;
        referencia?: string;
        syncId: string;
      }>;
    };
  }>("/ventas", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const body = validateBody(createVentaSchema, request.body, reply);
      if (!body) return;

      // Idempotent by syncId
      const existing = await db
        .select({ id: schema.ventas.id })
        .from(schema.ventas)
        .where(eq(schema.ventas.syncId, body.syncId))
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        return { id: existing.id, status: "already_synced" };
      }

      // Credit limit enforcement
      const creditPago = body.pagos.find((p) => p.formaPago === "credito");
      if (creditPago && body.clienteId) {
        const [cliente] = await db
          .select()
          .from(schema.clientes)
          .where(eq(schema.clientes.id, body.clienteId))
          .limit(1);

        if (cliente && cliente.limiteCredito > 0) {
          const newBalance = cliente.saldoCredito + creditPago.monto;
          if (newBalance > cliente.limiteCredito) {
            return reply.status(400).send({
              error: `Limite de credito excedido. Disponible: $${(cliente.limiteCredito - cliente.saldoCredito).toFixed(2)}`,
            });
          }
        }

        // Update client credit balance
        if (creditPago) {
          await db
            .update(schema.clientes)
            .set({
              saldoCredito: sql`${schema.clientes.saldoCredito} + ${creditPago.monto}`,
            })
            .where(eq(schema.clientes.id, body.clienteId));
        }
      }

      const [venta] = await db
        .insert(schema.ventas)
        .values({
          folio: body.folio,
          terminalId: body.terminalId,
          usuarioId: body.usuarioId,
          clienteId: body.clienteId || null,
          subtotal: body.subtotal,
          descuento: body.descuento,
          iva: body.iva,
          total: body.total,
          tipo: body.tipo as any,
          estado: body.estado as any,
          fecha: new Date(body.fecha),
          syncId: body.syncId,
          syncStatus: "sincronizado",
        })
        .returning({ id: schema.ventas.id });

      if (body.detalles.length > 0) {
        await db.insert(schema.ventaDetalles).values(
          body.detalles.map((d) => ({
            ventaId: venta.id,
            productoId: d.productoId,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            descuento: d.descuento,
            subtotal: d.subtotal,
            syncId: d.syncId,
            syncStatus: "sincronizado" as const,
          }))
        );
      }

      if (body.pagos.length > 0) {
        await db.insert(schema.pagos).values(
          body.pagos.map((p) => ({
            ventaId: venta.id,
            formaPago: p.formaPago as any,
            monto: p.monto,
            referencia: p.referencia || null,
            syncId: p.syncId,
            syncStatus: "sincronizado" as const,
          }))
        );
      }

      await logAudit({
        usuarioId: body.usuarioId,
        accion: "crear",
        entidad: "venta",
        entidadId: venta.id,
        descripcion: `Venta ${body.folio} por $${body.total}`,
      });

      return { id: venta.id, status: "synced" };
    },
  });

  // GET /ventas — list with pagination
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      terminalId?: string;
      desde?: string;
      hasta?: string;
    };
  }>("/ventas", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.terminalId) {
        conditions.push(eq(schema.ventas.terminalId, parseInt(request.query.terminalId, 10)));
      }
      if (request.query.desde) {
        conditions.push(gte(schema.ventas.fecha, new Date(request.query.desde)));
      }
      if (request.query.hasta) {
        conditions.push(lte(schema.ventas.fecha, new Date(request.query.hasta)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.ventas)
        .where(where)
        .orderBy(desc(schema.ventas.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /ventas/:id — with detalles and pagos
  app.get<{ Params: { id: string } }>("/ventas/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const venta = await db
        .select()
        .from(schema.ventas)
        .where(eq(schema.ventas.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!venta) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const detalles = await db
        .select()
        .from(schema.ventaDetalles)
        .where(eq(schema.ventaDetalles.ventaId, id));

      const pagos = await db
        .select()
        .from(schema.pagos)
        .where(eq(schema.pagos.ventaId, id));

      return { ...venta, detalles, pagos };
    },
  });
}
