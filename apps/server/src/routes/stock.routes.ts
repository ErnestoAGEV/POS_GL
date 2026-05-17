import { FastifyInstance } from "fastify";
import { eq, and, sql, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { emitNotification } from "../utils/notify.js";

export async function stockRoutes(app: FastifyInstance) {
  // GET /stock/alerts-global — products below minimum across all branches
  app.get("/stock/alerts-global", {
    preHandler: [app.authenticate],
    handler: async () => {
      const rows = await db
        .select({
          productoId: schema.stockSucursal.productoId,
          productoNombre: schema.productos.nombre,
          sku: schema.productos.sku,
          sucursalId: schema.stockSucursal.sucursalId,
          sucursalNombre: schema.sucursales.nombre,
          cantidad: schema.stockSucursal.cantidad,
          stockMinimo: schema.productos.stockMinimo,
        })
        .from(schema.stockSucursal)
        .innerJoin(schema.productos, eq(schema.stockSucursal.productoId, schema.productos.id))
        .innerJoin(schema.sucursales, eq(schema.stockSucursal.sucursalId, schema.sucursales.id))
        .where(
          and(
            lte(schema.stockSucursal.cantidad, sql`${schema.productos.stockMinimo}`),
            eq(schema.productos.activo, true),
            sql`${schema.productos.stockMinimo} > 0`
          )
        );

      return { data: rows, count: rows.length };
    },
  });

  // GET /stock/alerts?sucursalId=N — products below minimum stock
  app.get<{
    Querystring: { sucursalId: string };
  }>("/stock/alerts", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const sucursalId = parseInt(request.query.sucursalId, 10);

      const rows = await db
        .select({
          productoId: schema.stockSucursal.productoId,
          productoNombre: schema.productos.nombre,
          sku: schema.productos.sku,
          cantidad: schema.stockSucursal.cantidad,
          stockMinimo: schema.productos.stockMinimo,
        })
        .from(schema.stockSucursal)
        .innerJoin(
          schema.productos,
          eq(schema.stockSucursal.productoId, schema.productos.id)
        )
        .where(
          and(
            eq(schema.stockSucursal.sucursalId, sucursalId),
            lte(
              schema.stockSucursal.cantidad,
              sql`${schema.productos.stockMinimo}`
            ),
            eq(schema.productos.activo, true)
          )
        );

      return { data: rows };
    },
  });

  // GET /stock/:sucursalId — all stock for a branch
  app.get<{
    Params: { sucursalId: string };
  }>("/stock/:sucursalId", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const sucursalId = parseInt(request.params.sucursalId, 10);

      const rows = await db
        .select({
          productoId: schema.stockSucursal.productoId,
          productoNombre: schema.productos.nombre,
          sku: schema.productos.sku,
          codigoBarras: schema.productos.codigoBarras,
          cantidad: schema.stockSucursal.cantidad,
          stockMinimo: schema.productos.stockMinimo,
          precioVenta: schema.productos.precioVenta,
          costo: schema.productos.costo,
        })
        .from(schema.stockSucursal)
        .innerJoin(
          schema.productos,
          eq(schema.stockSucursal.productoId, schema.productos.id)
        )
        .where(
          and(
            eq(schema.stockSucursal.sucursalId, sucursalId),
            eq(schema.productos.activo, true)
          )
        );

      return { data: rows };
    },
  });

  // POST /stock/adjust — manual stock adjustment
  app.post<{
    Body: {
      productoId: number;
      sucursalId: number;
      cantidad: number;
      motivo: string;
    };
  }>("/stock/adjust", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const { productoId, sucursalId, cantidad, motivo } = request.body;

      const existing = await db
        .select()
        .from(schema.stockSucursal)
        .where(
          and(
            eq(schema.stockSucursal.productoId, productoId),
            eq(schema.stockSucursal.sucursalId, sucursalId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        await db
          .update(schema.stockSucursal)
          .set({ cantidad })
          .where(
            and(
              eq(schema.stockSucursal.productoId, productoId),
              eq(schema.stockSucursal.sucursalId, sucursalId)
            )
          );
      } else {
        await db.insert(schema.stockSucursal).values({
          productoId,
          sucursalId,
          cantidad,
        });
      }

      // Check if stock is now below minimum
      const [producto] = await db
        .select({ nombre: schema.productos.nombre, stockMinimo: schema.productos.stockMinimo })
        .from(schema.productos)
        .where(eq(schema.productos.id, productoId))
        .limit(1);

      if (producto && producto.stockMinimo > 0 && cantidad <= producto.stockMinimo) {
        emitNotification({
          tipo: "stock_bajo",
          titulo: "Stock bajo",
          mensaje: `${producto.nombre} tiene ${cantidad} unidades (min: ${producto.stockMinimo})`,
          datos: { productoId, sucursalId, cantidad, stockMinimo: producto.stockMinimo },
        });
      }

      return { status: "adjusted", productoId, sucursalId, cantidad, motivo };
    },
  });
}
