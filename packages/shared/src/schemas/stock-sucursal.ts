import { sqliteTable, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./_columns.js";
import { productos } from "./producto.js";
import { sucursales } from "./sucursal.js";

export const stockSucursal = sqliteTable(
  "stock_sucursal",
  {
    productoId: integer("producto_id").references(() => productos.id).notNull(),
    sucursalId: integer("sucursal_id").references(() => sucursales.id).notNull(),
    cantidad: real("cantidad").default(0).notNull(),
    ...syncColumns,
  },
  (table) => [primaryKey({ columns: [table.productoId, table.sucursalId] })]
);
