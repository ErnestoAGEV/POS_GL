import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./_columns.js";
import { usuarios } from "./usuario.js";

export const bitacora = sqliteTable("bitacora", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuarioId: integer("usuario_id").references(() => usuarios.id).notNull(),
  accion: text("accion").notNull(),
  entidad: text("entidad").notNull(),
  entidadId: integer("entidad_id"),
  descripcion: text("descripcion"),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
});
