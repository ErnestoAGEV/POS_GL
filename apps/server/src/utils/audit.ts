import { db, schema } from "../db/index.js";

export async function logAudit(params: {
  usuarioId: number;
  accion: string;
  entidad: string;
  entidadId?: number;
  descripcion?: string;
}) {
  await db.insert(schema.bitacora).values({
    usuarioId: params.usuarioId,
    accion: params.accion,
    entidad: params.entidad,
    entidadId: params.entidadId,
    descripcion: params.descripcion,
  });
}
