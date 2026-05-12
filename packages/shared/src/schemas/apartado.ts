import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { ventas } from "./venta.js";

export const apartados = sqliteTable("apartados", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id").references(() => ventas.id).notNull(),
  enganche: real("enganche").notNull(),
  saldoPendiente: real("saldo_pendiente").notNull(),
  estado: text("estado", { enum: ["activo", "liquidado", "cancelado"] }).default("activo").notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const apartadoAbonos = sqliteTable("apartado_abonos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apartadoId: integer("apartado_id").references(() => apartados.id).notNull(),
  monto: real("monto").notNull(),
  formaPago: text("forma_pago", { enum: ["efectivo", "tarjeta", "transferencia", "credito", "vale_despensa", "tarjeta_regalo"] }).notNull(),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
});
