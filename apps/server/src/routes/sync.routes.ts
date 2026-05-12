import { FastifyInstance } from "fastify";
import { gt, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function syncRoutes(app: FastifyInstance) {
  // GET /sync/products?since=<ISO timestamp>
  app.get<{
    Querystring: { since?: string };
  }>("/sync/products", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const since = request.query.since;

      if (since) {
        const rows = await db
          .select()
          .from(schema.productos)
          .where(gt(schema.productos.updatedAt, new Date(since)));
        return { data: rows, timestamp: new Date().toISOString() };
      }

      const rows = await db
        .select()
        .from(schema.productos)
        .where(eq(schema.productos.activo, true));
      return { data: rows, timestamp: new Date().toISOString() };
    },
  });

  // GET /sync/categories?since=<ISO timestamp>
  app.get<{
    Querystring: { since?: string };
  }>("/sync/categories", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const since = request.query.since;

      if (since) {
        const rows = await db
          .select()
          .from(schema.categorias)
          .where(gt(schema.categorias.updatedAt, new Date(since)));
        return { data: rows, timestamp: new Date().toISOString() };
      }

      const rows = await db
        .select()
        .from(schema.categorias)
        .where(eq(schema.categorias.activa, true));
      return { data: rows, timestamp: new Date().toISOString() };
    },
  });

  // GET /sync/stock?sucursalId=N&since=<ISO timestamp>
  app.get<{
    Querystring: { sucursalId: string; since?: string };
  }>("/sync/stock", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const sucursalId = parseInt(request.query.sucursalId, 10);
      const since = request.query.since;

      if (since) {
        const rows = await db
          .select()
          .from(schema.stockSucursal)
          .where(gt(schema.stockSucursal.updatedAt, new Date(since)));
        return {
          data: rows.filter((r) => r.sucursalId === sucursalId),
          timestamp: new Date().toISOString(),
        };
      }

      const rows = await db
        .select()
        .from(schema.stockSucursal)
        .where(eq(schema.stockSucursal.sucursalId, sucursalId));
      return { data: rows, timestamp: new Date().toISOString() };
    },
  });

  // POST /sync/ventas/batch — receive multiple ventas at once
  app.post<{
    Body: Array<{
      folio: string;
      terminalId: number;
      usuarioId: number;
      clienteId?: number;
      subtotal: number;
      descuento: number;
      iva: number;
      total: number;
      tipo: string;
      estado: string;
      fecha: string;
      syncId: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
        precioUnitario: number;
        descuento: number;
        subtotal: number;
        syncId: string;
      }>;
      pagos: Array<{
        formaPago: string;
        monto: number;
        referencia?: string;
        syncId: string;
      }>;
    }>;
  }>("/sync/ventas/batch", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const ventas = request.body;
      const results: Array<{ syncId: string; status: string }> = [];

      for (const v of ventas) {
        const existing = await db
          .select({ id: schema.ventas.id })
          .from(schema.ventas)
          .where(eq(schema.ventas.syncId, v.syncId))
          .limit(1)
          .then((rows) => rows[0]);

        if (existing) {
          results.push({ syncId: v.syncId, status: "already_synced" });
          continue;
        }

        const [venta] = await db
          .insert(schema.ventas)
          .values({
            folio: v.folio,
            terminalId: v.terminalId,
            usuarioId: v.usuarioId,
            clienteId: v.clienteId || null,
            subtotal: v.subtotal,
            descuento: v.descuento,
            iva: v.iva,
            total: v.total,
            tipo: v.tipo as any,
            estado: v.estado as any,
            fecha: new Date(v.fecha),
            syncId: v.syncId,
            syncStatus: "sincronizado",
          })
          .returning({ id: schema.ventas.id });

        if (v.detalles.length > 0) {
          await db.insert(schema.ventaDetalles).values(
            v.detalles.map((d) => ({
              ventaId: venta.id,
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              descuento: d.descuento,
              subtotal: d.subtotal,
              syncId: d.syncId,
              syncStatus: "sincronizado" as const,
            }))
          );
        }

        if (v.pagos.length > 0) {
          await db.insert(schema.pagos).values(
            v.pagos.map((p) => ({
              ventaId: venta.id,
              formaPago: p.formaPago as any,
              monto: p.monto,
              referencia: p.referencia || null,
              syncId: p.syncId,
              syncStatus: "sincronizado" as const,
            }))
          );
        }

        results.push({ syncId: v.syncId, status: "synced" });
      }

      return { results };
    },
  });
}
