import { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function apartadosRoutes(app: FastifyInstance) {
  // POST /apartados — create layaway
  app.post<{
    Body: {
      ventaId: number;
      clienteId?: number;
      enganche: number;
      total: number;
      fechaLimite?: string;
    };
  }>("/apartados", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const { ventaId, clienteId, enganche, total, fechaLimite } = request.body;

      const [apartado] = await db
        .insert(schema.apartados)
        .values({
          ventaId,
          clienteId: clienteId || null,
          enganche,
          saldoPendiente: total - enganche,
          total,
          estado: "activo",
          fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        })
        .returning();

      // Register initial payment as abono
      await db.insert(schema.apartadoAbonos).values({
        apartadoId: apartado.id,
        monto: enganche,
        formaPago: "efectivo",
      });

      // Mark sale as apartado
      await db
        .update(schema.ventas)
        .set({ tipo: "apartado", estado: "en_espera" })
        .where(eq(schema.ventas.id, ventaId));

      return apartado;
    },
  });

  // GET /apartados
  app.get<{
    Querystring: { estado?: string };
  }>("/apartados", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      if (request.query.estado) {
        return db
          .select()
          .from(schema.apartados)
          .where(eq(schema.apartados.estado, request.query.estado as any))
          .orderBy(desc(schema.apartados.fecha));
      }
      return db
        .select()
        .from(schema.apartados)
        .orderBy(desc(schema.apartados.fecha));
    },
  });

  // GET /apartados/:id
  app.get<{ Params: { id: string } }>("/apartados/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const [apartado] = await db
        .select()
        .from(schema.apartados)
        .where(eq(schema.apartados.id, id))
        .limit(1);

      if (!apartado) return reply.status(404).send({ error: "Not Found" });

      const abonos = await db
        .select()
        .from(schema.apartadoAbonos)
        .where(eq(schema.apartadoAbonos.apartadoId, id))
        .orderBy(desc(schema.apartadoAbonos.fecha));

      return { ...apartado, abonos };
    },
  });

  // POST /apartados/:id/abono — add payment
  app.post<{
    Params: { id: string };
    Body: { monto: number; formaPago: string };
  }>("/apartados/:id/abono", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const { monto, formaPago } = request.body;

      const [apartado] = await db
        .select()
        .from(schema.apartados)
        .where(eq(schema.apartados.id, id))
        .limit(1);

      if (!apartado || apartado.estado !== "activo") {
        return reply.status(400).send({ error: "Apartado no activo" });
      }

      await db.insert(schema.apartadoAbonos).values({
        apartadoId: id,
        monto,
        formaPago: formaPago as any,
      });

      const nuevoSaldo = apartado.saldoPendiente - monto;
      const liquidado = nuevoSaldo <= 0;

      await db
        .update(schema.apartados)
        .set({
          saldoPendiente: Math.max(0, nuevoSaldo),
          estado: liquidado ? "liquidado" : "activo",
        })
        .where(eq(schema.apartados.id, id));

      if (liquidado) {
        await db
          .update(schema.ventas)
          .set({ estado: "completada" })
          .where(eq(schema.ventas.id, apartado.ventaId));
      }

      return { saldoPendiente: Math.max(0, nuevoSaldo), liquidado };
    },
  });

  // PUT /apartados/:id/cancelar
  app.put<{ Params: { id: string } }>("/apartados/:id/cancelar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const [apartado] = await db
        .select()
        .from(schema.apartados)
        .where(eq(schema.apartados.id, id))
        .limit(1);

      if (!apartado || apartado.estado !== "activo") {
        return reply.status(400).send({ error: "Apartado no activo" });
      }

      await db
        .update(schema.apartados)
        .set({ estado: "cancelado" })
        .where(eq(schema.apartados.id, id));

      await db
        .update(schema.ventas)
        .set({ estado: "cancelada" })
        .where(eq(schema.ventas.id, apartado.ventaId));

      return { success: true };
    },
  });
}
