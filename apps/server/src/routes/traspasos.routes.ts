import { FastifyInstance } from "fastify";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function traspasosRoutes(app: FastifyInstance) {
  // POST /traspasos — create transfer
  app.post<{
    Body: {
      sucursalOrigenId: number;
      sucursalDestinoId: number;
      notas?: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
      }>;
    };
  }>("/traspasos", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const body = request.body;

      if (body.sucursalOrigenId === body.sucursalDestinoId) {
        return reply
          .status(400)
          .send({ error: "Origen y destino deben ser diferentes" });
      }

      const [traspaso] = await db
        .insert(schema.traspasos)
        .values({
          sucursalOrigenId: body.sucursalOrigenId,
          sucursalDestinoId: body.sucursalDestinoId,
          usuarioId: request.user!.userId,
          estado: "pendiente",
          notas: body.notas || null,
        })
        .returning();

      if (body.detalles.length > 0) {
        await db.insert(schema.traspasoDetalles).values(
          body.detalles.map((d) => ({
            traspasoId: traspaso.id,
            productoId: d.productoId,
            cantidad: d.cantidad,
          }))
        );
      }

      return traspaso;
    },
  });

  // GET /traspasos
  app.get<{
    Querystring: { page?: string; limit?: string; estado?: string };
  }>("/traspasos", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.estado) {
        conditions.push(
          eq(schema.traspasos.estado, request.query.estado as any)
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.traspasos)
        .where(where)
        .orderBy(desc(schema.traspasos.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /traspasos/:id
  app.get<{ Params: { id: string } }>("/traspasos/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const detalles = await db
        .select()
        .from(schema.traspasoDetalles)
        .where(eq(schema.traspasoDetalles.traspasoId, id));

      return { ...traspaso, detalles };
    },
  });

  // PUT /traspasos/:id/enviar — mark as in-transit, deduct from origin
  app.put<{ Params: { id: string } }>("/traspasos/:id/enviar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso || traspaso.estado !== "pendiente") {
        return reply
          .status(400)
          .send({ error: "Solo traspasos pendientes pueden enviarse" });
      }

      const detalles = await db
        .select()
        .from(schema.traspasoDetalles)
        .where(eq(schema.traspasoDetalles.traspasoId, id));

      for (const d of detalles) {
        await db
          .update(schema.stockSucursal)
          .set({
            cantidad: sql`${schema.stockSucursal.cantidad} - ${d.cantidad}`,
          })
          .where(
            and(
              eq(schema.stockSucursal.productoId, d.productoId),
              eq(schema.stockSucursal.sucursalId, traspaso.sucursalOrigenId)
            )
          );
      }

      await db
        .update(schema.traspasos)
        .set({ estado: "en_transito" })
        .where(eq(schema.traspasos.id, id));

      return { status: "en_transito" };
    },
  });

  // PUT /traspasos/:id/recibir — receive at destination, add stock
  app.put<{ Params: { id: string } }>("/traspasos/:id/recibir", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso || traspaso.estado !== "en_transito") {
        return reply
          .status(400)
          .send({ error: "Solo traspasos en transito pueden recibirse" });
      }

      const detalles = await db
        .select()
        .from(schema.traspasoDetalles)
        .where(eq(schema.traspasoDetalles.traspasoId, id));

      for (const d of detalles) {
        const existing = await db
          .select()
          .from(schema.stockSucursal)
          .where(
            and(
              eq(schema.stockSucursal.productoId, d.productoId),
              eq(schema.stockSucursal.sucursalId, traspaso.sucursalDestinoId)
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
                eq(schema.stockSucursal.sucursalId, traspaso.sucursalDestinoId)
              )
            );
        } else {
          await db.insert(schema.stockSucursal).values({
            productoId: d.productoId,
            sucursalId: traspaso.sucursalDestinoId,
            cantidad: d.cantidad,
          });
        }
      }

      await db
        .update(schema.traspasos)
        .set({ estado: "recibido" })
        .where(eq(schema.traspasos.id, id));

      return { status: "recibido" };
    },
  });

  // PUT /traspasos/:id/cancelar
  app.put<{ Params: { id: string } }>("/traspasos/:id/cancelar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (traspaso.estado === "recibido") {
        return reply
          .status(400)
          .send({ error: "No se puede cancelar un traspaso ya recibido" });
      }

      if (traspaso.estado === "en_transito") {
        const detalles = await db
          .select()
          .from(schema.traspasoDetalles)
          .where(eq(schema.traspasoDetalles.traspasoId, id));

        for (const d of detalles) {
          await db
            .update(schema.stockSucursal)
            .set({
              cantidad: sql`${schema.stockSucursal.cantidad} + ${d.cantidad}`,
            })
            .where(
              and(
                eq(schema.stockSucursal.productoId, d.productoId),
                eq(
                  schema.stockSucursal.sucursalId,
                  traspaso.sucursalOrigenId
                )
              )
            );
        }
      }

      await db
        .update(schema.traspasos)
        .set({ estado: "cancelado" })
        .where(eq(schema.traspasos.id, id));

      return { status: "cancelado" };
    },
  });
}
