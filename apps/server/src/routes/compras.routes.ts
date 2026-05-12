import { FastifyInstance } from "fastify";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function comprasRoutes(app: FastifyInstance) {
  // POST /compras — create purchase order
  app.post<{
    Body: {
      proveedorId: number;
      sucursalId: number;
      notas?: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
        costoUnitario: number;
      }>;
    };
  }>("/compras", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const body = request.body;
      const total = body.detalles.reduce(
        (sum, d) => sum + d.cantidad * d.costoUnitario,
        0
      );

      const [compra] = await db
        .insert(schema.compras)
        .values({
          proveedorId: body.proveedorId,
          sucursalId: body.sucursalId,
          usuarioId: request.user!.userId,
          total,
          estado: "pendiente",
          notas: body.notas || null,
        })
        .returning();

      if (body.detalles.length > 0) {
        await db.insert(schema.compraDetalles).values(
          body.detalles.map((d) => ({
            compraId: compra.id,
            productoId: d.productoId,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario,
            subtotal: d.cantidad * d.costoUnitario,
          }))
        );
      }

      return compra;
    },
  });

  // GET /compras — list with pagination
  app.get<{
    Querystring: { page?: string; limit?: string; estado?: string };
  }>("/compras", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.estado) {
        conditions.push(eq(schema.compras.estado, request.query.estado as any));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.compras)
        .where(where)
        .orderBy(desc(schema.compras.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /compras/:id — with detalles
  app.get<{ Params: { id: string } }>("/compras/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const compra = await db
        .select()
        .from(schema.compras)
        .where(eq(schema.compras.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!compra) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const detalles = await db
        .select()
        .from(schema.compraDetalles)
        .where(eq(schema.compraDetalles.compraId, id));

      return { ...compra, detalles };
    },
  });

  // PUT /compras/:id/recibir — receive purchase, update stock
  app.put<{ Params: { id: string } }>("/compras/:id/recibir", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const compra = await db
        .select()
        .from(schema.compras)
        .where(eq(schema.compras.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!compra) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (compra.estado !== "pendiente") {
        return reply
          .status(400)
          .send({ error: "Solo se pueden recibir compras pendientes" });
      }

      await db
        .update(schema.compras)
        .set({
          estado: "recibida",
          fechaRecepcion: new Date(),
        })
        .where(eq(schema.compras.id, id));

      const detalles = await db
        .select()
        .from(schema.compraDetalles)
        .where(eq(schema.compraDetalles.compraId, id));

      for (const d of detalles) {
        const existing = await db
          .select()
          .from(schema.stockSucursal)
          .where(
            and(
              eq(schema.stockSucursal.productoId, d.productoId),
              eq(schema.stockSucursal.sucursalId, compra.sucursalId)
            )
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (existing) {
          await db
            .update(schema.stockSucursal)
            .set({
              cantidad: sql`${schema.stockSucursal.cantidad} + ${d.cantidad}`,
            })
            .where(
              and(
                eq(schema.stockSucursal.productoId, d.productoId),
                eq(schema.stockSucursal.sucursalId, compra.sucursalId)
              )
            );
        } else {
          await db.insert(schema.stockSucursal).values({
            productoId: d.productoId,
            sucursalId: compra.sucursalId,
            cantidad: d.cantidad,
          });
        }

        await db
          .update(schema.productos)
          .set({ costo: d.costoUnitario })
          .where(eq(schema.productos.id, d.productoId));
      }

      return { status: "recibida" };
    },
  });

  // PUT /compras/:id/cancelar
  app.put<{ Params: { id: string } }>("/compras/:id/cancelar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const compra = await db
        .select()
        .from(schema.compras)
        .where(eq(schema.compras.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!compra) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (compra.estado !== "pendiente") {
        return reply
          .status(400)
          .send({ error: "Solo se pueden cancelar compras pendientes" });
      }

      await db
        .update(schema.compras)
        .set({ estado: "cancelada" })
        .where(eq(schema.compras.id, id));

      return { status: "cancelada" };
    },
  });
}
