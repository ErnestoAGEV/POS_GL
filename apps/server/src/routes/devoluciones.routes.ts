import { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function devolucionesRoutes(app: FastifyInstance) {
  // POST /devoluciones
  app.post<{
    Body: {
      ventaId: number;
      motivo: string;
      items: Array<{
        productoId: number;
        nombre: string;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }>;
      total: number;
    };
  }>("/devoluciones", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { ventaId, motivo, items, total } = request.body;

      const folio = `DEV-${Date.now().toString(36).toUpperCase()}`;

      const [devolucion] = await db
        .insert(schema.devoluciones)
        .values({
          ventaId,
          folio,
          usuarioId: request.user!.userId,
          motivo,
          total,
          itemsJson: JSON.stringify(items),
        })
        .returning();

      // Check if full return — cancel original sale
      const [original] = await db
        .select()
        .from(schema.ventas)
        .where(eq(schema.ventas.id, ventaId))
        .limit(1);

      if (original && Math.abs(original.total - total) < 0.01) {
        await db
          .update(schema.ventas)
          .set({ estado: "cancelada" })
          .where(eq(schema.ventas.id, ventaId));
      }

      return devolucion;
    },
  });

  // GET /devoluciones
  app.get("/devoluciones", {
    preHandler: [app.authenticate],
    handler: async () => {
      return db
        .select()
        .from(schema.devoluciones)
        .orderBy(desc(schema.devoluciones.fecha))
        .limit(100);
    },
  });
}
