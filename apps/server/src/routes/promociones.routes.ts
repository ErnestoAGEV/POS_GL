import { FastifyInstance } from "fastify";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function promocionesRoutes(app: FastifyInstance) {
  // POST /promociones
  app.post<{
    Body: {
      nombre: string;
      tipo: "2x1" | "nxprecio" | "porcentaje" | "monto_fijo";
      valor: number;
      precioObjetivo?: number;
      productoId?: number;
      categoriaId?: number;
      fechaInicio: string;
      fechaFin: string;
    };
  }>("/promociones", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const body = request.body;

      const [promo] = await db
        .insert(schema.promociones)
        .values({
          nombre: body.nombre,
          tipo: body.tipo,
          valor: body.valor,
          precioObjetivo: body.precioObjetivo || null,
          productoId: body.productoId || null,
          categoriaId: body.categoriaId || null,
          fechaInicio: new Date(body.fechaInicio),
          fechaFin: new Date(body.fechaFin),
          activa: true,
        })
        .returning();

      return promo;
    },
  });

  // GET /promociones
  app.get<{
    Querystring: { activas?: string };
  }>("/promociones", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const conditions: any[] = [];

      if (request.query.activas === "true") {
        conditions.push(eq(schema.promociones.activa, true));
        const now = new Date();
        conditions.push(lte(schema.promociones.fechaInicio, now));
        conditions.push(gte(schema.promociones.fechaFin, now));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return db
        .select()
        .from(schema.promociones)
        .where(where)
        .orderBy(desc(schema.promociones.fechaInicio));
    },
  });

  // PUT /promociones/:id
  app.put<{
    Params: { id: string };
    Body: {
      nombre?: string;
      valor?: number;
      precioObjetivo?: number;
      fechaInicio?: string;
      fechaFin?: string;
      activa?: boolean;
    };
  }>("/promociones/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.promociones)
        .where(eq(schema.promociones.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const values: Record<string, any> = {};
      if (body.nombre !== undefined) values.nombre = body.nombre;
      if (body.valor !== undefined) values.valor = body.valor;
      if (body.precioObjetivo !== undefined) values.precioObjetivo = body.precioObjetivo;
      if (body.fechaInicio !== undefined) values.fechaInicio = new Date(body.fechaInicio);
      if (body.fechaFin !== undefined) values.fechaFin = new Date(body.fechaFin);
      if (body.activa !== undefined) values.activa = body.activa;

      const [updated] = await db
        .update(schema.promociones)
        .set(values)
        .where(eq(schema.promociones.id, id))
        .returning();

      return updated;
    },
  });

  // DELETE /promociones/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/promociones/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      await db
        .update(schema.promociones)
        .set({ activa: false })
        .where(eq(schema.promociones.id, id));

      return reply.status(204).send();
    },
  });
}
