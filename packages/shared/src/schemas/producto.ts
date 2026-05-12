import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { categorias } from "./categoria.js";

export const productos = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  sku: text("sku").unique(),
  codigoBarras: text("codigo_barras").unique(),
  precioVenta: real("precio_venta").notNull(),
  costo: real("costo").default(0).notNull(),
  categoriaId: integer("categoria_id").references(() => categorias.id),
  stockMinimo: integer("stock_minimo").default(0).notNull(),
  claveSat: text("clave_sat"),
  unidadSat: text("unidad_sat"),
  tasaIva: real("tasa_iva").default(0.16).notNull(),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
