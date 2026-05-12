import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function sucursalesRoutes(app: FastifyInstance) {
  // GET /sucursales — paginated list with search by nombre/direccion
  app.get<{ Querystring: { search?: string; page?: string; limit?: string } }>(
    "/sucursales",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const { search } = request.query;
      const { offset, limit, page } = parsePagination(request.query as Record<string, unknown>);

      const whereClause = search
        ? or(
            like(schema.sucursales.nombre, `%${search}%`),
            like(schema.sucursales.direccion, `%${search}%`)
          )
        : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(schema.sucursales)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.sucursales)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return buildPaginatedResponse(rows, total, page, limit);
    }
  );

  // GET /sucursales/:id
  app.get<{ Params: { id: string } }>(
    "/sucursales/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const row = await db
        .select()
        .from(schema.sucursales)
        .where(eq(schema.sucursales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        return reply.status(404).send({ error: "Not Found", message: "Sucursal no encontrada" });
      }
      return row;
    }
  );

  // POST /sucursales — admin only, requires nombre
  app.post<{ Body: Record<string, unknown> }>(
    "/sucursales",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const body = request.body;

      if (!body.nombre || typeof body.nombre !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "nombre es requerido" });
      }

      const [created] = await db
        .insert(schema.sucursales)
        .values({
          nombre: body.nombre as string,
          direccion: body.direccion as string | undefined,
          telefono: body.telefono as string | undefined,
          rfc: body.rfc as string | undefined,
          razonSocial: body.razonSocial as string | undefined,
          regimenFiscal: body.regimenFiscal as string | undefined,
          codigoPostal: body.codigoPostal as string | undefined,
        })
        .returning();

      return reply.status(201).send(created);
    }
  );

  // PUT /sucursales/:id — admin only
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/sucursales/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.sucursales)
        .where(eq(schema.sucursales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Sucursal no encontrada" });
      }

      const [updated] = await db
        .update(schema.sucursales)
        .set({
          nombre: body.nombre !== undefined ? (body.nombre as string) : existing.nombre,
          direccion: body.direccion !== undefined ? (body.direccion as string) : existing.direccion,
          telefono: body.telefono !== undefined ? (body.telefono as string) : existing.telefono,
          rfc: body.rfc !== undefined ? (body.rfc as string) : existing.rfc,
          razonSocial: body.razonSocial !== undefined ? (body.razonSocial as string) : existing.razonSocial,
          regimenFiscal: body.regimenFiscal !== undefined ? (body.regimenFiscal as string) : existing.regimenFiscal,
          codigoPostal: body.codigoPostal !== undefined ? (body.codigoPostal as string) : existing.codigoPostal,
          activa: body.activa !== undefined ? (body.activa as boolean) : existing.activa,
        })
        .where(eq(schema.sucursales.id, id))
        .returning();

      return updated;
    }
  );

  // DELETE /sucursales/:id — soft delete (activa=false), admin only
  app.delete<{ Params: { id: string } }>(
    "/sucursales/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const existing = await db
        .select()
        .from(schema.sucursales)
        .where(eq(schema.sucursales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Sucursal no encontrada" });
      }

      await db
        .update(schema.sucursales)
        .set({ activa: false })
        .where(eq(schema.sucursales.id, id));

      return reply.status(204).send();
    }
  );
}
