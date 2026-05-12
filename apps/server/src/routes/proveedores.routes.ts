import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function proveedoresRoutes(app: FastifyInstance) {
  // GET /proveedores — auth required, search by nombre/rfc
  app.get<{ Querystring: { search?: string; page?: string; limit?: string } }>(
    "/proveedores",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const { search } = request.query;
      const { offset, limit, page } = parsePagination(request.query as Record<string, unknown>);

      const whereClause = search
        ? or(
            like(schema.proveedores.nombre, `%${search}%`),
            like(schema.proveedores.rfc, `%${search}%`)
          )
        : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(schema.proveedores)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.proveedores)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return buildPaginatedResponse(rows, total, page, limit);
    }
  );

  // GET /proveedores/:id — auth required
  app.get<{ Params: { id: string } }>(
    "/proveedores/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const row = await db
        .select()
        .from(schema.proveedores)
        .where(eq(schema.proveedores.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        return reply.status(404).send({ error: "Not Found", message: "Proveedor no encontrado" });
      }
      return row;
    }
  );

  // POST /proveedores — admin only, requires nombre
  app.post<{ Body: Record<string, unknown> }>(
    "/proveedores",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const body = request.body;

      if (!body.nombre || typeof body.nombre !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "nombre es requerido" });
      }

      const [created] = await db
        .insert(schema.proveedores)
        .values({
          nombre: body.nombre as string,
          contacto: body.contacto as string | undefined,
          telefono: body.telefono as string | undefined,
          email: body.email as string | undefined,
          rfc: body.rfc as string | undefined,
        })
        .returning();

      return reply.status(201).send(created);
    }
  );

  // PUT /proveedores/:id — admin only
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/proveedores/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.proveedores)
        .where(eq(schema.proveedores.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Proveedor no encontrado" });
      }

      const [updated] = await db
        .update(schema.proveedores)
        .set({
          nombre: body.nombre !== undefined ? (body.nombre as string) : existing.nombre,
          contacto: body.contacto !== undefined ? (body.contacto as string) : existing.contacto,
          telefono: body.telefono !== undefined ? (body.telefono as string) : existing.telefono,
          email: body.email !== undefined ? (body.email as string) : existing.email,
          rfc: body.rfc !== undefined ? (body.rfc as string) : existing.rfc,
          activo: body.activo !== undefined ? (body.activo as boolean) : existing.activo,
        })
        .where(eq(schema.proveedores.id, id))
        .returning();

      return updated;
    }
  );

  // DELETE /proveedores/:id — soft delete (activo=false), admin only
  app.delete<{ Params: { id: string } }>(
    "/proveedores/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const existing = await db
        .select()
        .from(schema.proveedores)
        .where(eq(schema.proveedores.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Proveedor no encontrado" });
      }

      await db
        .update(schema.proveedores)
        .set({ activo: false })
        .where(eq(schema.proveedores.id, id));

      return reply.status(204).send();
    }
  );
}
