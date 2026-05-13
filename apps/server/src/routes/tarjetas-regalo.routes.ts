import { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function tarjetasRegaloRoutes(app: FastifyInstance) {
  // POST /tarjetas-regalo — create gift card
  app.post<{
    Body: {
      codigo: string;
      saldo: number;
      clienteId?: number;
    };
  }>("/tarjetas-regalo", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const { codigo, saldo, clienteId } = request.body;

      const [tarjeta] = await db
        .insert(schema.tarjetasRegalo)
        .values({
          codigo,
          saldo,
          clienteId: clienteId || null,
          activa: true,
        })
        .returning();

      // Register initial load
      await db.insert(schema.tarjetaRegaloMovimientos).values({
        tarjetaId: tarjeta.id,
        tipo: "carga",
        monto: saldo,
      });

      return tarjeta;
    },
  });

  // GET /tarjetas-regalo
  app.get("/tarjetas-regalo", {
    preHandler: [app.authenticate],
    handler: async () => {
      return db
        .select()
        .from(schema.tarjetasRegalo)
        .orderBy(desc(schema.tarjetasRegalo.createdAt));
    },
  });

  // GET /tarjetas-regalo/:codigo/balance
  app.get<{ Params: { codigo: string } }>("/tarjetas-regalo/:codigo/balance", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const [tarjeta] = await db
        .select()
        .from(schema.tarjetasRegalo)
        .where(eq(schema.tarjetasRegalo.codigo, request.params.codigo))
        .limit(1);

      if (!tarjeta) return reply.status(404).send({ error: "Tarjeta no encontrada" });
      if (!tarjeta.activa) return reply.status(400).send({ error: "Tarjeta inactiva" });

      return { codigo: tarjeta.codigo, saldo: tarjeta.saldo, activa: tarjeta.activa };
    },
  });

  // POST /tarjetas-regalo/:id/cargar — add funds
  app.post<{
    Params: { id: string };
    Body: { monto: number };
  }>("/tarjetas-regalo/:id/cargar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const { monto } = request.body;

      const [tarjeta] = await db
        .select()
        .from(schema.tarjetasRegalo)
        .where(eq(schema.tarjetasRegalo.id, id))
        .limit(1);

      if (!tarjeta || !tarjeta.activa) {
        return reply.status(400).send({ error: "Tarjeta no encontrada o inactiva" });
      }

      await db
        .update(schema.tarjetasRegalo)
        .set({ saldo: tarjeta.saldo + monto })
        .where(eq(schema.tarjetasRegalo.id, id));

      await db.insert(schema.tarjetaRegaloMovimientos).values({
        tarjetaId: id,
        tipo: "carga",
        monto,
      });

      return { saldo: tarjeta.saldo + monto };
    },
  });

  // POST /tarjetas-regalo/:id/consumir — use funds
  app.post<{
    Params: { id: string };
    Body: { monto: number; ventaId?: number };
  }>("/tarjetas-regalo/:id/consumir", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const { monto, ventaId } = request.body;

      const [tarjeta] = await db
        .select()
        .from(schema.tarjetasRegalo)
        .where(eq(schema.tarjetasRegalo.id, id))
        .limit(1);

      if (!tarjeta || !tarjeta.activa) {
        return reply.status(400).send({ error: "Tarjeta no encontrada o inactiva" });
      }

      if (tarjeta.saldo < monto) {
        return reply.status(400).send({ error: "Saldo insuficiente" });
      }

      await db
        .update(schema.tarjetasRegalo)
        .set({ saldo: tarjeta.saldo - monto })
        .where(eq(schema.tarjetasRegalo.id, id));

      await db.insert(schema.tarjetaRegaloMovimientos).values({
        tarjetaId: id,
        tipo: "consumo",
        monto,
        ventaId: ventaId || null,
      });

      return { saldo: tarjeta.saldo - monto };
    },
  });
}
