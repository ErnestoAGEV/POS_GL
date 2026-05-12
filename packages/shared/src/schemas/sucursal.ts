import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";

export const sucursales = sqliteTable("sucursales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  direccion: text("direccion"),
  telefono: text("telefono"),
  rfc: text("rfc"),
  razonSocial: text("razon_social"),
  regimenFiscal: text("regimen_fiscal"),
  codigoPostal: text("codigo_postal"),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
