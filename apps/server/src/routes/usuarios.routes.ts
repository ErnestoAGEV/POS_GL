import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

const USER_FIELDS = {
  id: schema.usuarios.id,
  nombre: schema.usuarios.nombre,
  username: schema.usuarios.username,
  rol: schema.usuarios.rol,
  sucursalId: schema.usuarios.sucursalId,
  activo: schema.usuarios.activo,
  syncId: schema.usuarios.syncId,
  createdAt: schema.usuarios.createdAt,
};

export async function usuariosRoutes(app: FastifyInstance) {
  // GET /usuarios — admin only, search by nombre/username
  app.get<{ Querystring: { search?: string; page?: string; limit?: string } }>(
    "/usuarios",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const { search } = request.query;
      const { offset, limit, page } = parsePagination(request.query as Record<string, unknown>);

      const whereClause = search
        ? or(
            like(schema.usuarios.nombre, `%${search}%`),
            like(schema.usuarios.username, `%${search}%`)
          )
        : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select(USER_FIELDS)
          .from(schema.usuarios)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.usuarios)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return buildPaginatedResponse(rows, total, page, limit);
    }
  );

  // GET /usuarios/:id — auth required
  app.get<{ Params: { id: string } }>(
    "/usuarios/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const row = await db
        .select(USER_FIELDS)
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }
      return row;
    }
  );

  // POST /usuarios — admin only, hash password with bcrypt, check unique username
  app.post<{ Body: Record<string, unknown> }>(
    "/usuarios",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const body = request.body;

      if (!body.nombre || typeof body.nombre !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "nombre es requerido" });
      }
      if (!body.username || typeof body.username !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "username es requerido" });
      }
      if (!body.password || typeof body.password !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "password es requerido" });
      }
      if (!body.rol || (body.rol !== "admin" && body.rol !== "cajero")) {
        return reply.status(400).send({ error: "Validation Error", message: "rol debe ser 'admin' o 'cajero'" });
      }
      if (!body.sucursalId) {
        return reply.status(400).send({ error: "Validation Error", message: "sucursalId es requerido" });
      }

      // Check unique username
      const existing = await db
        .select({ id: schema.usuarios.id })
        .from(schema.usuarios)
        .where(eq(schema.usuarios.username, body.username as string))
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        return reply.status(409).send({ error: "Conflict", message: "El username ya está en uso" });
      }

      const passwordHash = await bcrypt.hash(body.password as string, 10);

      const [created] = await db
        .insert(schema.usuarios)
        .values({
          nombre: body.nombre as string,
          username: body.username as string,
          passwordHash,
          rol: body.rol as "admin" | "cajero",
          sucursalId: Number(body.sucursalId),
        })
        .returning({
          id: schema.usuarios.id,
          nombre: schema.usuarios.nombre,
          username: schema.usuarios.username,
          rol: schema.usuarios.rol,
          sucursalId: schema.usuarios.sucursalId,
          activo: schema.usuarios.activo,
          syncId: schema.usuarios.syncId,
          createdAt: schema.usuarios.createdAt,
        });

      return reply.status(201).send(created);
    }
  );

  // PUT /usuarios/:id — admin only, if password provided hash it
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/usuarios/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }

      // Check unique username if being changed
      if (body.username && body.username !== existing.username) {
        const usernameConflict = await db
          .select({ id: schema.usuarios.id })
          .from(schema.usuarios)
          .where(eq(schema.usuarios.username, body.username as string))
          .limit(1)
          .then((rows) => rows[0]);

        if (usernameConflict) {
          return reply.status(409).send({ error: "Conflict", message: "El username ya está en uso" });
        }
      }

      let passwordHash = existing.passwordHash;
      if (body.password && typeof body.password === "string") {
        passwordHash = await bcrypt.hash(body.password, 10);
      }

      const [updated] = await db
        .update(schema.usuarios)
        .set({
          nombre: body.nombre !== undefined ? (body.nombre as string) : existing.nombre,
          username: body.username !== undefined ? (body.username as string) : existing.username,
          passwordHash,
          rol: body.rol !== undefined ? (body.rol as "admin" | "cajero") : existing.rol,
          sucursalId: body.sucursalId !== undefined ? Number(body.sucursalId) : existing.sucursalId,
          activo: body.activo !== undefined ? (body.activo as boolean) : existing.activo,
        })
        .where(eq(schema.usuarios.id, id))
        .returning({
          id: schema.usuarios.id,
          nombre: schema.usuarios.nombre,
          username: schema.usuarios.username,
          rol: schema.usuarios.rol,
          sucursalId: schema.usuarios.sucursalId,
          activo: schema.usuarios.activo,
          syncId: schema.usuarios.syncId,
          createdAt: schema.usuarios.createdAt,
        });

      return updated;
    }
  );

  // DELETE /usuarios/:id — soft delete (activo=false), admin only
  app.delete<{ Params: { id: string } }>(
    "/usuarios/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const existing = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }

      await db
        .update(schema.usuarios)
        .set({ activo: false })
        .where(eq(schema.usuarios.id, id));

      return reply.status(204).send();
    }
  );
}
