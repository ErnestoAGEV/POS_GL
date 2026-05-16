import { FastifyInstance } from "fastify";
import { eq, desc, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { createDevolucionSchema } from "../schemas/validation.js";
import { validateBody } from "../utils/validate.js";
import { logAudit } from "../utils/audit.js";

export async function devolucionesRoutes(app: FastifyInstance) {
  // POST /devoluciones
  app.post<{
    Body: {
      ventaId: number;
      motivo: string;
      items: Array<{
        productoId: number;
        nombre: string;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }>;
      total: number;
    };
  }>("/devoluciones", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const parsed = validateBody(createDevolucionSchema, request.body, reply);
      if (!parsed) return;

      const { ventaId, motivo, items, total } = parsed;

      const folio = `DEV-${Date.now().toString(36).toUpperCase()}`;

      const [devolucion] = await db
        .insert(schema.devoluciones)
        .values({
          ventaId,
          folio,
          usuarioId: request.user!.userId,
          motivo,
          total,
          itemsJson: JSON.stringify(items),
        })
        .returning();

      // Restore stock: find sucursalId via venta -> terminal -> sucursal
      const [original] = await db
        .select()
        .from(schema.ventas)
        .where(eq(schema.ventas.id, ventaId))
        .limit(1);

      if (original?.terminalId) {
        const [terminal] = await db
          .select({ sucursalId: schema.terminales.sucursalId })
          .from(schema.terminales)
          .where(eq(schema.terminales.id, original.terminalId))
          .limit(1);

        if (terminal) {
          for (const item of items) {
            const [stock] = await db
              .select()
              .from(schema.stockSucursal)
              .where(
                and(
                  eq(schema.stockSucursal.productoId, item.productoId),
                  eq(schema.stockSucursal.sucursalId, terminal.sucursalId)
                )
              )
              .limit(1);

            if (stock) {
              await db
                .update(schema.stockSucursal)
                .set({ cantidad: stock.cantidad + item.cantidad })
                .where(
                  and(
                    eq(schema.stockSucursal.productoId, item.productoId),
                    eq(schema.stockSucursal.sucursalId, terminal.sucursalId)
                  )
                );
            } else {
              await db.insert(schema.stockSucursal).values({
                productoId: item.productoId,
                sucursalId: terminal.sucursalId,
                cantidad: item.cantidad,
              });
            }
          }
        }
      }

      // Check if full return — cancel original sale
      if (original && Math.abs(original.total - total) < 0.01) {
        await db
          .update(schema.ventas)
          .set({ estado: "cancelada" })
          .where(eq(schema.ventas.id, ventaId));
      }

      await logAudit({
        usuarioId: request.user!.userId,
        accion: "crear",
        entidad: "devolucion",
        entidadId: devolucion.id,
        descripcion: `Devolucion ${folio} por $${total} - ${motivo}`,
      });

      return devolucion;
    },
  });

  // GET /devoluciones
  app.get("/devoluciones", {
    preHandler: [app.authenticate],
    handler: async () => {
      return db
        .select()
        .from(schema.devoluciones)
        .orderBy(desc(schema.devoluciones.fecha))
        .limit(100);
    },
  });
}
