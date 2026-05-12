import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { sucursales } from "./sucursal.js";

export const terminales = sqliteTable("terminales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sucursalId: integer("sucursal_id").references(() => sucursales.id).notNull(),
  nombre: text("nombre").notNull(),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
