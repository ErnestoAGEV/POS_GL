import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./_columns.js";
import { ventas } from "./venta.js";

export const pagos = sqliteTable("pagos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id").references(() => ventas.id).notNull(),
  formaPago: text("forma_pago", { enum: ["efectivo", "tarjeta", "transferencia", "credito", "vale_despensa", "tarjeta_regalo"] }).notNull(),
  monto: real("monto").notNull(),
  referencia: text("referencia"),
  ...syncColumns,
});
