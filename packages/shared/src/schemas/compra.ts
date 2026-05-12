import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { proveedores } from "./proveedor.js";
import { sucursales } from "./sucursal.js";
import { productos } from "./producto.js";

export const compras = sqliteTable("compras", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  proveedorId: integer("proveedor_id").references(() => proveedores.id).notNull(),
  sucursalId: integer("sucursal_id").references(() => sucursales.id).notNull(),
  total: real("total").notNull(),
  fecha: text("fecha").$defaultFn(() => new Date().toISOString()).notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const compraDetalles = sqliteTable("compra_detalles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  compraId: integer("compra_id").references(() => compras.id).notNull(),
  productoId: integer("producto_id").references(() => productos.id).notNull(),
  cantidad: real("cantidad").notNull(),
  costoUnitario: real("costo_unitario").notNull(),
  ...syncColumns,
});
