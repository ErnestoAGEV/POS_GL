import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";

export const proveedores = sqliteTable("proveedores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  contacto: text("contacto"),
  telefono: text("telefono"),
  email: text("email"),
  rfc: text("rfc"),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
