import { FastifyInstance } from "fastify";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function bitacoraRoutes(app: FastifyInstance) {
  // POST /bitacora — log an action
  app.post<{
    Body: {
      accion: string;
      entidad: string;
      entidadId?: number;
      descripcion?: string;
    };
  }>("/bitacora", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const { accion, entidad, entidadId, descripcion } = request.body;

      const [entry] = await db
        .insert(schema.bitacora)
        .values({
          usuarioId: request.user!.userId,
          accion,
          entidad,
          entidadId: entidadId || null,
          descripcion: descripcion || null,
        })
        .returning();

      return entry;
    },
  });

  // GET /bitacora — list with filters
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      accion?: string;
      entidad?: string;
      desde?: string;
      hasta?: string;
    };
  }>("/bitacora", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.accion) {
        conditions.push(eq(schema.bitacora.accion, request.query.accion));
      }
      if (request.query.entidad) {
        conditions.push(eq(schema.bitacora.entidad, request.query.entidad));
      }
      if (request.query.desde) {
        conditions.push(gte(schema.bitacora.fecha, new Date(request.query.desde)));
      }
      if (request.query.hasta) {
        conditions.push(lte(schema.bitacora.fecha, new Date(request.query.hasta)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.bitacora)
        .where(where)
        .orderBy(desc(schema.bitacora.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });
}
