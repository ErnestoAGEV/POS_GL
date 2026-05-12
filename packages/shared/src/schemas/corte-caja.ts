import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { terminales } from "./terminal.js";
import { usuarios } from "./usuario.js";

export const cortesCaja = sqliteTable("cortes_caja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  terminalId: integer("terminal_id").references(() => terminales.id).notNull(),
  usuarioId: integer("usuario_id").references(() => usuarios.id).notNull(),
  tipo: text("tipo", { enum: ["parcial", "final"] }).notNull(),
  efectivoInicial: real("efectivo_inicial").default(0).notNull(),
  efectivoSistema: real("efectivo_sistema").default(0).notNull(),
  efectivoDeclarado: real("efectivo_declarado"),
  diferencia: real("diferencia"),
  totalVentas: real("total_ventas").default(0).notNull(),
  totalEfectivo: real("total_efectivo").default(0).notNull(),
  totalTarjeta: real("total_tarjeta").default(0).notNull(),
  totalTransferencia: real("total_transferencia").default(0).notNull(),
  totalOtros: real("total_otros").default(0).notNull(),
  fechaApertura: text("fecha_apertura").notNull(),
  fechaCierre: text("fecha_cierre"),
  ...syncColumns,
  ...timestampColumns,
});

export const movimientosCaja = sqliteTable("movimientos_caja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  corteId: integer("corte_id").references(() => cortesCaja.id).notNull(),
  tipo: text("tipo", { enum: ["entrada", "salida"] }).notNull(),
  monto: real("monto").notNull(),
  concepto: text("concepto").notNull(),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
});
