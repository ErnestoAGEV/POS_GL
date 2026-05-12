import { FastifyInstance } from "fastify";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function cortesRoutes(app: FastifyInstance) {
  // POST /cortes/abrir — open a new cash cut (start of shift)
  app.post<{
    Body: {
      terminalId: number;
      efectivoInicial: number;
    };
  }>("/cortes/abrir", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { terminalId, efectivoInicial } = request.body;

      // Check if there's already an open cut for this terminal
      const openCut = await db
        .select()
        .from(schema.cortesCaja)
        .where(
          and(
            eq(schema.cortesCaja.terminalId, terminalId),
            isNull(schema.cortesCaja.fechaCierre)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (openCut) {
        return reply
          .status(400)
          .send({ error: "Ya existe un corte abierto para esta terminal" });
      }

      const [corte] = await db
        .insert(schema.cortesCaja)
        .values({
          terminalId,
          usuarioId: request.user!.userId,
          tipo: "parcial",
          efectivoInicial,
        })
        .returning();

      return corte;
    },
  });

  // PUT /cortes/:id/cerrar — close cash cut
  app.put<{
    Params: { id: string };
    Body: {
      tipo: "parcial" | "final";
      efectivoDeclarado: number;
      efectivoSistema: number;
      totalVentas: number;
      totalEfectivo: number;
      totalTarjeta: number;
      totalTransferencia: number;
      totalOtros: number;
    };
  }>("/cortes/:id/cerrar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const body = request.body;

      const corte = await db
        .select()
        .from(schema.cortesCaja)
        .where(eq(schema.cortesCaja.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!corte) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (corte.fechaCierre) {
        return reply.status(400).send({ error: "Este corte ya fue cerrado" });
      }

      const diferencia = body.efectivoDeclarado - body.efectivoSistema;

      const [updated] = await db
        .update(schema.cortesCaja)
        .set({
          tipo: body.tipo,
          efectivoSistema: body.efectivoSistema,
          efectivoDeclarado: body.efectivoDeclarado,
          diferencia,
          totalVentas: body.totalVentas,
          totalEfectivo: body.totalEfectivo,
          totalTarjeta: body.totalTarjeta,
          totalTransferencia: body.totalTransferencia,
          totalOtros: body.totalOtros,
          fechaCierre: new Date(),
        })
        .where(eq(schema.cortesCaja.id, id))
        .returning();

      return updated;
    },
  });

  // GET /cortes — list with pagination
  app.get<{
    Querystring: { page?: string; limit?: string; terminalId?: string };
  }>("/cortes", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.terminalId) {
        conditions.push(
          eq(
            schema.cortesCaja.terminalId,
            parseInt(request.query.terminalId, 10)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.cortesCaja)
        .where(where)
        .orderBy(desc(schema.cortesCaja.fechaApertura))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /cortes/:id — with movements
  app.get<{ Params: { id: string } }>("/cortes/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const corte = await db
        .select()
        .from(schema.cortesCaja)
        .where(eq(schema.cortesCaja.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!corte) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const movimientos = await db
        .select()
        .from(schema.movimientosCaja)
        .where(eq(schema.movimientosCaja.corteId, id));

      return { ...corte, movimientos };
    },
  });

  // POST /cortes/:id/movimientos — add cash movement
  app.post<{
    Params: { id: string };
    Body: {
      tipo: "entrada" | "salida";
      monto: number;
      concepto: string;
    };
  }>("/cortes/:id/movimientos", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const corteId = parseInt(request.params.id, 10);
      const { tipo, monto, concepto } = request.body;

      const corte = await db
        .select()
        .from(schema.cortesCaja)
        .where(eq(schema.cortesCaja.id, corteId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!corte) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (corte.fechaCierre) {
        return reply
          .status(400)
          .send({ error: "No se pueden agregar movimientos a un corte cerrado" });
      }

      const [movimiento] = await db
        .insert(schema.movimientosCaja)
        .values({
          corteId,
          tipo,
          monto,
          concepto,
        })
        .returning();

      return movimiento;
    },
  });

  // GET /cortes/activo/:terminalId — get active cut for terminal
  app.get<{ Params: { terminalId: string } }>("/cortes/activo/:terminalId", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const terminalId = parseInt(request.params.terminalId, 10);

      const corte = await db
        .select()
        .from(schema.cortesCaja)
        .where(
          and(
            eq(schema.cortesCaja.terminalId, terminalId),
            isNull(schema.cortesCaja.fechaCierre)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!corte) {
        return { active: false, corte: null };
      }

      const movimientos = await db
        .select()
        .from(schema.movimientosCaja)
        .where(eq(schema.movimientosCaja.corteId, corte.id));

      return { active: true, corte: { ...corte, movimientos } };
    },
  });
}
