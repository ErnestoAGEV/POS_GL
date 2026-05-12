import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { sucursales } from "./sucursal.js";
import { usuarios } from "./usuario.js";
import { productos } from "./producto.js";

export const traspasos = sqliteTable("traspasos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sucursalOrigenId: integer("sucursal_origen_id").references(() => sucursales.id).notNull(),
  sucursalDestinoId: integer("sucursal_destino_id").references(() => sucursales.id).notNull(),
  usuarioId: integer("usuario_id").references(() => usuarios.id).notNull(),
  estado: text("estado", { enum: ["pendiente", "en_transito", "recibido", "cancelado"] }).default("pendiente").notNull(),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const traspasoDetalles = sqliteTable("traspaso_detalles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  traspasoId: integer("traspaso_id").references(() => traspasos.id).notNull(),
  productoId: integer("producto_id").references(() => productos.id).notNull(),
  cantidad: real("cantidad").notNull(),
  ...syncColumns,
});
