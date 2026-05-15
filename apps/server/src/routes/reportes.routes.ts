import { FastifyInstance } from "fastify";
import { and, gte, lte, eq, desc, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function reportesRoutes(app: FastifyInstance) {
  // GET /reportes/resumen — sales summary for period
  app.get<{
    Querystring: { desde: string; hasta: string };
  }>("/reportes/resumen", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const desde = new Date(request.query.desde);
      const hasta = new Date(request.query.hasta);

      const ventas = await db
        .select()
        .from(schema.ventas)
        .where(
          and(
            eq(schema.ventas.estado, "completada"),
            gte(schema.ventas.fecha, desde),
            lte(schema.ventas.fecha, hasta)
          )
        );

      const totalVentas = ventas.length;
      const totalMonto = ventas.reduce((s, v) => s + v.total, 0);
      const totalDescuento = ventas.reduce((s, v) => s + v.descuento, 0);
      const ticketPromedio = totalVentas > 0 ? totalMonto / totalVentas : 0;

      return { totalVentas, totalMonto, totalDescuento, ticketPromedio };
    },
  });

  // GET /reportes/ventas-diarias — daily sales trend
  app.get<{
    Querystring: { desde: string; hasta: string };
  }>("/reportes/ventas-diarias", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const desde = new Date(request.query.desde);
      const hasta = new Date(request.query.hasta);

      const ventas = await db
        .select()
        .from(schema.ventas)
        .where(
          and(
            eq(schema.ventas.estado, "completada"),
            gte(schema.ventas.fecha, desde),
            lte(schema.ventas.fecha, hasta)
          )
        );

      // Group by day
      const byDay = new Map<string, { ventas: number; total: number }>();
      for (const v of ventas) {
        const dia = v.fecha.toISOString().split("T")[0];
        const entry = byDay.get(dia) || { ventas: 0, total: 0 };
        entry.ventas++;
        entry.total += v.total;
        byDay.set(dia, entry);
      }

      return Array.from(byDay.entries())
        .map(([dia, data]) => ({ dia, ...data }))
        .sort((a, b) => a.dia.localeCompare(b.dia));
    },
  });

  // GET /reportes/top-productos — top selling products
  app.get<{
    Querystring: { desde: string; hasta: string; limit?: string };
  }>("/reportes/top-productos", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const desde = new Date(request.query.desde);
      const hasta = new Date(request.query.hasta);
      const limit = parseInt(request.query.limit || "10", 10);

      const ventas = await db
        .select({ id: schema.ventas.id })
        .from(schema.ventas)
        .where(
          and(
            eq(schema.ventas.estado, "completada"),
            gte(schema.ventas.fecha, desde),
            lte(schema.ventas.fecha, hasta)
          )
        );

      const ventaIds = ventas.map((v) => v.id);
      if (ventaIds.length === 0) return [];

      const detalles = await db
        .select()
        .from(schema.ventaDetalles)
        .where(sql`${schema.ventaDetalles.ventaId} IN (${sql.join(ventaIds.map(id => sql`${id}`), sql`, `)})`);

      // Aggregate by product
      const byProduct = new Map<number, { productoId: number; cantidadTotal: number; montoTotal: number }>();
      for (const d of detalles) {
        const entry = byProduct.get(d.productoId) || { productoId: d.productoId, cantidadTotal: 0, montoTotal: 0 };
        entry.cantidadTotal += d.cantidad;
        entry.montoTotal += d.subtotal;
        byProduct.set(d.productoId, entry);
      }

      const sorted = Array.from(byProduct.values())
        .sort((a, b) => b.cantidadTotal - a.cantidadTotal)
        .slice(0, limit);

      // Enrich with product names
      const productIds = sorted.map((s) => s.productoId);
      const productos = await db
        .select()
        .from(schema.productos)
        .where(sql`${schema.productos.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);

      const productMap = new Map(productos.map((p) => [p.id, p]));

      return sorted.map((s) => ({
        ...s,
        nombre: productMap.get(s.productoId)?.nombre || "Desconocido",
        sku: productMap.get(s.productoId)?.sku || null,
      }));
    },
  });

  // GET /reportes/metodos-pago — payment methods breakdown
  app.get<{
    Querystring: { desde: string; hasta: string };
  }>("/reportes/metodos-pago", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const desde = new Date(request.query.desde);
      const hasta = new Date(request.query.hasta);

      const ventas = await db
        .select({ id: schema.ventas.id })
        .from(schema.ventas)
        .where(
          and(
            eq(schema.ventas.estado, "completada"),
            gte(schema.ventas.fecha, desde),
            lte(schema.ventas.fecha, hasta)
          )
        );

      const ventaIds = ventas.map((v) => v.id);
      if (ventaIds.length === 0) return [];

      const pagos = await db
        .select()
        .from(schema.pagos)
        .where(sql`${schema.pagos.ventaId} IN (${sql.join(ventaIds.map(id => sql`${id}`), sql`, `)})`);

      const byMethod = new Map<string, { formaPago: string; cantidad: number; total: number }>();
      for (const p of pagos) {
        const entry = byMethod.get(p.formaPago) || { formaPago: p.formaPago, cantidad: 0, total: 0 };
        entry.cantidad++;
        entry.total += p.monto;
        byMethod.set(p.formaPago, entry);
      }

      return Array.from(byMethod.values()).sort((a, b) => b.total - a.total);
    },
  });

  // GET /reportes/ventas-por-vendedor — sales grouped by cashier
  app.get<{
    Querystring: { desde: string; hasta: string };
  }>("/reportes/ventas-por-vendedor", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const desde = new Date(request.query.desde);
      const hasta = new Date(request.query.hasta);

      const ventas = await db
        .select()
        .from(schema.ventas)
        .where(
          and(
            eq(schema.ventas.estado, "completada"),
            gte(schema.ventas.fecha, desde),
            lte(schema.ventas.fecha, hasta)
          )
        );

      const byUser = new Map<number, { usuarioId: number; ventas: number; total: number }>();
      for (const v of ventas) {
        const entry = byUser.get(v.usuarioId) || { usuarioId: v.usuarioId, ventas: 0, total: 0 };
        entry.ventas++;
        entry.total += v.total;
        byUser.set(v.usuarioId, entry);
      }

      const sorted = Array.from(byUser.values()).sort((a, b) => b.total - a.total);

      // Enrich with user names
      const userIds = sorted.map((s) => s.usuarioId);
      if (userIds.length === 0) return [];

      const usuarios = await db
        .select({ id: schema.usuarios.id, nombre: schema.usuarios.nombre })
        .from(schema.usuarios)
        .where(sql`${schema.usuarios.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);

      const userMap = new Map(usuarios.map((u) => [u.id, u.nombre]));

      return sorted.map((s) => ({
        ...s,
        nombre: userMap.get(s.usuarioId) || "Desconocido",
        ticketPromedio: s.ventas > 0 ? s.total / s.ventas : 0,
      }));
    },
  });

  // GET /reportes/ventas-por-hora — sales grouped by hour of day
  app.get<{
    Querystring: { desde: string; hasta: string };
  }>("/reportes/ventas-por-hora", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const desde = new Date(request.query.desde);
      const hasta = new Date(request.query.hasta);

      const ventas = await db
        .select()
        .from(schema.ventas)
        .where(
          and(
            eq(schema.ventas.estado, "completada"),
            gte(schema.ventas.fecha, desde),
            lte(schema.ventas.fecha, hasta)
          )
        );

      const byHour = new Map<number, { hora: number; ventas: number; total: number }>();
      for (const v of ventas) {
        const hora = v.fecha.getHours();
        const entry = byHour.get(hora) || { hora, ventas: 0, total: 0 };
        entry.ventas++;
        entry.total += v.total;
        byHour.set(hora, entry);
      }

      // Fill all 24 hours
      const result = [];
      for (let h = 0; h < 24; h++) {
        const entry = byHour.get(h) || { hora: h, ventas: 0, total: 0 };
        result.push(entry);
      }

      return result;
    },
  });

  // GET /reportes/ventas-por-sucursal — sales grouped by branch
  app.get<{
    Querystring: { desde: string; hasta: string };
  }>("/reportes/ventas-por-sucursal", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const desde = new Date(request.query.desde);
      const hasta = new Date(request.query.hasta);

      const ventas = await db
        .select()
        .from(schema.ventas)
        .where(
          and(
            eq(schema.ventas.estado, "completada"),
            gte(schema.ventas.fecha, desde),
            lte(schema.ventas.fecha, hasta)
          )
        );

      // ventas -> terminalId -> sucursalId
      const terminalIds = [...new Set(ventas.map((v) => v.terminalId))];
      if (terminalIds.length === 0) return [];

      const terminales = await db
        .select({ id: schema.terminales.id, sucursalId: schema.terminales.sucursalId })
        .from(schema.terminales)
        .where(sql`${schema.terminales.id} IN (${sql.join(terminalIds.map(id => sql`${id}`), sql`, `)})`);

      const termSucMap = new Map(terminales.map((t) => [t.id, t.sucursalId]));

      const bySuc = new Map<number, { sucursalId: number; ventas: number; total: number }>();
      for (const v of ventas) {
        const sucId = termSucMap.get(v.terminalId) ?? 0;
        const entry = bySuc.get(sucId) || { sucursalId: sucId, ventas: 0, total: 0 };
        entry.ventas++;
        entry.total += v.total;
        bySuc.set(sucId, entry);
      }

      const sorted = Array.from(bySuc.values()).sort((a, b) => b.total - a.total);

      // Enrich with branch names
      const sucIds = sorted.map((s) => s.sucursalId).filter((id) => id > 0);
      if (sucIds.length === 0) return sorted.map((s) => ({ ...s, nombre: "Sin sucursal" }));

      const sucursales = await db
        .select({ id: schema.sucursales.id, nombre: schema.sucursales.nombre })
        .from(schema.sucursales)
        .where(sql`${schema.sucursales.id} IN (${sql.join(sucIds.map(id => sql`${id}`), sql`, `)})`);

      const sucMap = new Map(sucursales.map((s) => [s.id, s.nombre]));

      return sorted.map((s) => ({
        ...s,
        nombre: sucMap.get(s.sucursalId) || "Sin sucursal",
      }));
    },
  });
}
