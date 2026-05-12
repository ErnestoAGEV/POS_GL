import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { clientes } from "./cliente.js";
import { ventas } from "./venta.js";

export const tarjetasRegalo = sqliteTable("tarjetas_regalo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  saldo: real("saldo").default(0).notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const tarjetaRegaloMovimientos = sqliteTable("tarjeta_regalo_movimientos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tarjetaId: integer("tarjeta_id").references(() => tarjetasRegalo.id).notNull(),
  tipo: text("tipo", { enum: ["carga", "consumo"] }).notNull(),
  monto: real("monto").notNull(),
  ventaId: integer("venta_id").references(() => ventas.id),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
});
