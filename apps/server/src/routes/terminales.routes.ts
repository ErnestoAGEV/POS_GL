import { FastifyInstance } from "fastify";
import { eq, sql, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function terminalesRoutes(app: FastifyInstance) {
  // GET /terminales — optional ?sucursalId=N filter
  app.get<{ Querystring: { sucursalId?: string; page?: string; limit?: string } }>(
    "/terminales",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const { sucursalId } = request.query;
      const { offset, limit, page } = parsePagination(request.query as Record<string, unknown>);

      const whereClause = sucursalId
        ? eq(schema.terminales.sucursalId, Number(sucursalId))
        : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(schema.terminales)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.terminales)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return buildPaginatedResponse(rows, total, page, limit);
    }
  );

  // GET /terminales/:id
  app.get<{ Params: { id: string } }>(
    "/terminales/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const row = await db
        .select()
        .from(schema.terminales)
        .where(eq(schema.terminales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        return reply.status(404).send({ error: "Not Found", message: "Terminal no encontrada" });
      }
      return row;
    }
  );

  // POST /terminales — admin only, requires nombre, sucursalId
  app.post<{ Body: Record<string, unknown> }>(
    "/terminales",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const body = request.body;

      if (!body.nombre || typeof body.nombre !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "nombre es requerido" });
      }
      if (!body.sucursalId) {
        return reply.status(400).send({ error: "Validation Error", message: "sucursalId es requerido" });
      }

      const [created] = await db
        .insert(schema.terminales)
        .values({
          nombre: body.nombre as string,
          sucursalId: Number(body.sucursalId),
        })
        .returning();

      return reply.status(201).send(created);
    }
  );

  // PUT /terminales/:id — admin only
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/terminales/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.terminales)
        .where(eq(schema.terminales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Terminal no encontrada" });
      }

      const [updated] = await db
        .update(schema.terminales)
        .set({
          nombre: body.nombre !== undefined ? (body.nombre as string) : existing.nombre,
          sucursalId: body.sucursalId !== undefined ? Number(body.sucursalId) : existing.sucursalId,
          activa: body.activa !== undefined ? (body.activa as boolean) : existing.activa,
        })
        .where(eq(schema.terminales.id, id))
        .returning();

      return updated;
    }
  );

  // DELETE /terminales/:id — soft delete (activa=false), admin only
  app.delete<{ Params: { id: string } }>(
    "/terminales/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const existing = await db
        .select()
        .from(schema.terminales)
        .where(eq(schema.terminales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Terminal no encontrada" });
      }

      await db
        .update(schema.terminales)
        .set({ activa: false })
        .where(eq(schema.terminales.id, id));

      return reply.status(204).send();
    }
  );
}
