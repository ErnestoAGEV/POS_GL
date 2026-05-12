import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  telefono: text("telefono"),
  email: text("email"),
  rfc: text("rfc"),
  razonSocial: text("razon_social"),
  regimenFiscal: text("regimen_fiscal"),
  usoCfdi: text("uso_cfdi"),
  domicilioFiscal: text("domicilio_fiscal"),
  limiteCredito: real("limite_credito").default(0).notNull(),
  saldoCredito: real("saldo_credito").default(0).notNull(),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
