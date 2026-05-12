import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { terminales } from "./terminal.js";
import { usuarios } from "./usuario.js";
import { clientes } from "./cliente.js";
import { productos } from "./producto.js";

export const ventas = sqliteTable("ventas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  folio: text("folio").notNull().unique(),
  terminalId: integer("terminal_id").references(() => terminales.id).notNull(),
  usuarioId: integer("usuario_id").references(() => usuarios.id).notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  subtotal: real("subtotal").notNull(),
  descuento: real("descuento").default(0).notNull(),
  iva: real("iva").notNull(),
  total: real("total").notNull(),
  tipo: text("tipo", { enum: ["normal", "apartado", "cotizacion"] }).default("normal").notNull(),
  estado: text("estado", { enum: ["completada", "cancelada", "en_espera", "cotizacion"] }).default("completada").notNull(),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const ventaDetalles = sqliteTable("venta_detalles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id").references(() => ventas.id).notNull(),
  productoId: integer("producto_id").references(() => productos.id).notNull(),
  cantidad: real("cantidad").notNull(),
  precioUnitario: real("precio_unitario").notNull(),
  descuento: real("descuento").default(0).notNull(),
  subtotal: real("subtotal").notNull(),
  ...syncColumns,
});
