import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { clientes } from "./cliente.js";

export const facturas = sqliteTable("facturas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaIds: text("venta_ids").notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  uuidFiscal: text("uuid_fiscal"),
  xml: text("xml"),
  pdf: text("pdf"),
  tipo: text("tipo", { enum: ["individual", "global", "nota_credito", "complemento"] }).notNull(),
  estado: text("estado", { enum: ["timbrada", "cancelada"] }).default("timbrada").notNull(),
  serieSat: text("serie_sat"),
  folioSat: text("folio_sat"),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
