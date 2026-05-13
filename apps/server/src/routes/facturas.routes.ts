import { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { randomUUID } from "crypto";

export async function facturasRoutes(app: FastifyInstance) {
  // POST /facturas — create invoice (stub: generates UUID, no PAC call yet)
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

      // Verify client exists
      const cliente = await db
        .select()
        .from(schema.clientes)
        .where(eq(schema.clientes.id, clienteId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!cliente) {
        return reply.status(404).send({ error: "Cliente no encontrado" });
      }

      // Generate stub UUID (in production, this comes from PAC/Finkok)
      const uuidFiscal = randomUUID().toUpperCase();
      const folioSat = `F-${Date.now().toString(36).toUpperCase()}`;

      const [factura] = await db
        .insert(schema.facturas)
        .values({
          ventaIds: JSON.stringify(ventaIds),
          clienteId,
          uuidFiscal,
          tipo,
          estado: "timbrada",
          serieSat: "A",
          folioSat,
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

      // Get client info
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

  // PUT /facturas/:id/cancelar — cancel invoice (stub: no SAT call)
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

      // In production: call SAT cancellation via PAC
      await db
        .update(schema.facturas)
        .set({ estado: "cancelada" })
        .where(eq(schema.facturas.id, id));

      return { status: "cancelada" };
    },
  });
}
