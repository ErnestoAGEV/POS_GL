import { FastifyInstance } from "fastify";
import { eq, and, sql, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function stockRoutes(app: FastifyInstance) {
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

      return { status: "adjusted", productoId, sucursalId, cantidad, motivo };
    },
  });
}
