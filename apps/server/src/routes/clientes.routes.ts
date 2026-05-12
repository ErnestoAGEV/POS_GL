import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function clientesRoutes(app: FastifyInstance) {
  // GET /clientes — auth required, search by nombre/rfc/telefono
  app.get<{ Querystring: { search?: string; page?: string; limit?: string } }>(
    "/clientes",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const { search } = request.query;
      const { offset, limit, page } = parsePagination(request.query as Record<string, unknown>);

      const whereClause = search
        ? or(
            like(schema.clientes.nombre, `%${search}%`),
            like(schema.clientes.rfc, `%${search}%`),
            like(schema.clientes.telefono, `%${search}%`)
          )
        : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(schema.clientes)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.clientes)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return buildPaginatedResponse(rows, total, page, limit);
    }
  );

  // GET /clientes/:id — auth required
  app.get<{ Params: { id: string } }>(
    "/clientes/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const row = await db
        .select()
        .from(schema.clientes)
        .where(eq(schema.clientes.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        return reply.status(404).send({ error: "Not Found", message: "Cliente no encontrado" });
      }
      return row;
    }
  );

  // POST /clientes — auth required, requires nombre
  app.post<{ Body: Record<string, unknown> }>(
    "/clientes",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const body = request.body;

      if (!body.nombre || typeof body.nombre !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "nombre es requerido" });
      }

      const [created] = await db
        .insert(schema.clientes)
        .values({
          nombre: body.nombre as string,
          telefono: body.telefono as string | undefined,
          email: body.email as string | undefined,
          rfc: body.rfc as string | undefined,
          razonSocial: body.razonSocial as string | undefined,
          regimenFiscal: body.regimenFiscal as string | undefined,
          usoCfdi: body.usoCfdi as string | undefined,
          domicilioFiscal: body.domicilioFiscal as string | undefined,
          limiteCredito: body.limiteCredito !== undefined ? Number(body.limiteCredito) : undefined,
          saldoCredito: body.saldoCredito !== undefined ? Number(body.saldoCredito) : undefined,
        })
        .returning();

      return reply.status(201).send(created);
    }
  );

  // PUT /clientes/:id — auth required
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/clientes/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.clientes)
        .where(eq(schema.clientes.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Cliente no encontrado" });
      }

      const [updated] = await db
        .update(schema.clientes)
        .set({
          nombre: body.nombre !== undefined ? (body.nombre as string) : existing.nombre,
          telefono: body.telefono !== undefined ? (body.telefono as string) : existing.telefono,
          email: body.email !== undefined ? (body.email as string) : existing.email,
          rfc: body.rfc !== undefined ? (body.rfc as string) : existing.rfc,
          razonSocial: body.razonSocial !== undefined ? (body.razonSocial as string) : existing.razonSocial,
          regimenFiscal: body.regimenFiscal !== undefined ? (body.regimenFiscal as string) : existing.regimenFiscal,
          usoCfdi: body.usoCfdi !== undefined ? (body.usoCfdi as string) : existing.usoCfdi,
          domicilioFiscal: body.domicilioFiscal !== undefined ? (body.domicilioFiscal as string) : existing.domicilioFiscal,
          limiteCredito: body.limiteCredito !== undefined ? Number(body.limiteCredito) : existing.limiteCredito,
          saldoCredito: body.saldoCredito !== undefined ? Number(body.saldoCredito) : existing.saldoCredito,
          activo: body.activo !== undefined ? (body.activo as boolean) : existing.activo,
        })
        .where(eq(schema.clientes.id, id))
        .returning();

      return updated;
    }
  );

  // DELETE /clientes/:id — soft delete (activo=false), admin only
  app.delete<{ Params: { id: string } }>(
    "/clientes/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const existing = await db
        .select()
        .from(schema.clientes)
        .where(eq(schema.clientes.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Cliente no encontrado" });
      }

      await db
        .update(schema.clientes)
        .set({ activo: false })
        .where(eq(schema.clientes.id, id));

      return reply.status(204).send();
    }
  );
}
