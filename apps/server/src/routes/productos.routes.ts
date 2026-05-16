import { FastifyInstance } from "fastify";
import { eq, sql, like, or, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function productosRoutes(app: FastifyInstance) {
  // GET /productos/barcode/:code — lookup by barcode (registered before /:id to avoid conflict)
  app.get<{ Params: { code: string } }>(
    "/productos/barcode/:code",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const row = await db
        .select()
        .from(schema.productos)
        .where(eq(schema.productos.codigoBarras, request.params.code))
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }
      return row;
    }
  );

  // GET /productos — search by nombre/sku/codigoBarras, filter by ?categoriaId=N
  app.get<{ Querystring: { search?: string; categoriaId?: string; page?: string; limit?: string } }>(
    "/productos",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const { search, categoriaId } = request.query;
      const { offset, limit, page } = parsePagination(request.query as Record<string, unknown>);

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(schema.productos.nombre, `%${search}%`),
            like(schema.productos.sku, `%${search}%`),
            like(schema.productos.codigoBarras, `%${search}%`)
          )
        );
      }
      if (categoriaId) {
        conditions.push(eq(schema.productos.categoriaId, Number(categoriaId)));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(schema.productos)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.productos)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return buildPaginatedResponse(rows, total, page, limit);
    }
  );

  // GET /productos/:id — include stock from stockSucursal table
  app.get<{ Params: { id: string } }>(
    "/productos/:id",
    { preHandler: [app.authenticate, requireAuth] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const [producto, stock] = await Promise.all([
        db
          .select()
          .from(schema.productos)
          .where(eq(schema.productos.id, id))
          .limit(1)
          .then((rows) => rows[0]),
        db
          .select()
          .from(schema.stockSucursal)
          .where(eq(schema.stockSucursal.productoId, id)),
      ]);

      if (!producto) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }

      return { ...producto, stock };
    }
  );

  // POST /productos — admin only, requires nombre, precioVenta
  app.post<{ Body: Record<string, unknown> }>(
    "/productos",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const body = request.body;

      if (!body.nombre || typeof body.nombre !== "string") {
        return reply.status(400).send({ error: "Validation Error", message: "nombre es requerido" });
      }
      if (body.precioVenta === undefined || body.precioVenta === null) {
        return reply.status(400).send({ error: "Validation Error", message: "precioVenta es requerido" });
      }

      const [created] = await db
        .insert(schema.productos)
        .values({
          nombre: body.nombre as string,
          precioVenta: Number(body.precioVenta),
          sku: body.sku as string | undefined,
          codigoBarras: body.codigoBarras as string | undefined,
          costo: body.costo !== undefined ? Number(body.costo) : undefined,
          categoriaId: body.categoriaId !== undefined ? Number(body.categoriaId) : undefined,
          stockMinimo: body.stockMinimo !== undefined ? Number(body.stockMinimo) : undefined,
          claveSat: body.claveSat as string | undefined,
          unidadSat: body.unidadSat as string | undefined,
          tasaIva: body.tasaIva !== undefined ? Number(body.tasaIva) : undefined,
        })
        .returning();

      app.io.emit("product:created", created);
      return reply.status(201).send(created);
    }
  );

  // PUT /productos/:id — admin only
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/productos/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);
      const body = request.body;

      const existing = await db
        .select()
        .from(schema.productos)
        .where(eq(schema.productos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }

      const [updated] = await db
        .update(schema.productos)
        .set({
          nombre: body.nombre !== undefined ? (body.nombre as string) : existing.nombre,
          precioVenta: body.precioVenta !== undefined ? Number(body.precioVenta) : existing.precioVenta,
          sku: body.sku !== undefined ? (body.sku as string) : existing.sku,
          codigoBarras: body.codigoBarras !== undefined ? (body.codigoBarras as string) : existing.codigoBarras,
          costo: body.costo !== undefined ? Number(body.costo) : existing.costo,
          categoriaId:
            body.categoriaId !== undefined
              ? body.categoriaId === null
                ? null
                : Number(body.categoriaId)
              : existing.categoriaId,
          stockMinimo: body.stockMinimo !== undefined ? Number(body.stockMinimo) : existing.stockMinimo,
          claveSat: body.claveSat !== undefined ? (body.claveSat as string) : existing.claveSat,
          unidadSat: body.unidadSat !== undefined ? (body.unidadSat as string) : existing.unidadSat,
          tasaIva: body.tasaIva !== undefined ? Number(body.tasaIva) : existing.tasaIva,
          activo: body.activo !== undefined ? (body.activo as boolean) : existing.activo,
        })
        .where(eq(schema.productos.id, id))
        .returning();

      app.io.emit("product:updated", updated);
      return updated;
    }
  );

  // POST /productos/bulk — import multiple products at once (admin only)
  app.post<{
    Body: Array<{
      nombre: string;
      sku?: string;
      codigoBarras?: string;
      precioVenta: number;
      costo?: number;
      categoriaId?: number;
      stockMinimo?: number;
      claveSat?: string;
      unidadSat?: string;
      tasaIva?: number;
    }>;
  }>(
    "/productos/bulk",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const items = request.body;
      if (!Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({ error: "Se requiere un array de productos" });
      }
      if (items.length > 500) {
        return reply.status(400).send({ error: "Maximo 500 productos por lote" });
      }

      const results: { created: number; errors: string[] } = { created: 0, errors: [] };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.nombre || !item.precioVenta) {
          results.errors.push(`Fila ${i + 1}: nombre y precioVenta son requeridos`);
          continue;
        }
        try {
          await db.insert(schema.productos).values({
            nombre: item.nombre,
            precioVenta: Number(item.precioVenta),
            sku: item.sku || undefined,
            codigoBarras: item.codigoBarras || undefined,
            costo: item.costo !== undefined ? Number(item.costo) : undefined,
            categoriaId: item.categoriaId !== undefined ? Number(item.categoriaId) : undefined,
            stockMinimo: item.stockMinimo !== undefined ? Number(item.stockMinimo) : undefined,
            claveSat: item.claveSat || undefined,
            unidadSat: item.unidadSat || undefined,
            tasaIva: item.tasaIva !== undefined ? Number(item.tasaIva) : undefined,
          });
          results.created++;
        } catch (err: any) {
          results.errors.push(`Fila ${i + 1}: ${err.message || "Error al insertar"}`);
        }
      }

      return reply.status(201).send(results);
    }
  );

  // DELETE /productos/:id — soft delete (activo=false), admin only
  app.delete<{ Params: { id: string } }>(
    "/productos/:id",
    { preHandler: [app.authenticate, requireAdmin] },
    async (request, reply) => {
      const id = Number(request.params.id);

      const existing = await db
        .select()
        .from(schema.productos)
        .where(eq(schema.productos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }

      await db
        .update(schema.productos)
        .set({ activo: false })
        .where(eq(schema.productos.id, id));

      app.io.emit("product:deleted", { id });
      return reply.status(204).send();
    }
  );
}
