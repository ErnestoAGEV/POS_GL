import { FastifyInstance } from "fastify";
import { eq, sql, isNull } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function categoriasRoutes(app: FastifyInstance) {
  // GET /categorias — ?parentId=root for root categories, ?parentId=N for children
  app.get<{ Querystring: { parentId?: string; page?: string; limit?: string } }>(
    "/categorias",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const { parentId } = request.query;
      const { offset, limit, page } = parsePagination(request.query as Record<string, unknown>);

      let whereClause;
      if (parentId === "root") {
        whereClause = isNull(schema.categorias.categoriaPadreId);
      } else if (parentId !== undefined) {
        whereClause = eq(schema.categorias.categoriaPadreId, Number(parentId));
      }

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(schema.categorias)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.categorias)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return buildPaginatedResponse(rows, total, page, limit);
    }
  );

  // GET /categorias/:id
  app.get<{ Params: { id: string } }>(
    "/categorias/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const row = await db
        .select()
        .from(schema.categorias)
        .where(eq(schema.categorias.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        return reply.status(404).send({ error: "Not Found", message: "Categoría no encontrada" });
      }
      return row;
    }
  );

  // POST /categorias — admin only, requires nombre, optional categoriaPadreId
  app.post<{ Body: Record<string, unknown> }>(
    "/categorias",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const body = request.body;

      if (!body.nombre || typeof body.nombre !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "nombre es requerido" });
      }

      const [created] = await db
        .insert(schema.categorias)
        .values({
          nombre: body.nombre as string,
          categoriaPadreId: body.categoriaPadreId !== undefined ? Number(body.categoriaPadreId) : undefined,
        })
        .returning();

      return reply.status(201).send(created);
    }
  );

  // PUT /categorias/:id — admin only
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/categorias/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.categorias)
        .where(eq(schema.categorias.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Categoría no encontrada" });
      }

      const [updated] = await db
        .update(schema.categorias)
        .set({
          nombre: body.nombre !== undefined ? (body.nombre as string) : existing.nombre,
          categoriaPadreId:
            body.categoriaPadreId !== undefined
              ? body.categoriaPadreId === null
                ? null
                : Number(body.categoriaPadreId)
              : existing.categoriaPadreId,
          activa: body.activa !== undefined ? (body.activa as boolean) : existing.activa,
        })
        .where(eq(schema.categorias.id, id))
        .returning();

      return updated;
    }
  );

  // DELETE /categorias/:id — soft delete (activa=false), admin only
  app.delete<{ Params: { id: string } }>(
    "/categorias/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const existing = await db
        .select()
        .from(schema.categorias)
        .where(eq(schema.categorias.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Categoría no encontrada" });
      }

      await db
        .update(schema.categorias)
        .set({ activa: false })
        .where(eq(schema.categorias.id, id));

      return reply.status(204).send();
    }
  );
}
