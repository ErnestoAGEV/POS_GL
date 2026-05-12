import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { productos } from "./producto.js";
import { categorias } from "./categoria.js";

export const promociones = sqliteTable("promociones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["2x1", "nxprecio", "porcentaje", "monto_fijo"] }).notNull(),
  valor: real("valor").notNull(),
  precioObjetivo: real("precio_objetivo"),
  productoId: integer("producto_id").references(() => productos.id),
  categoriaId: integer("categoria_id").references(() => categorias.id),
  fechaInicio: text("fecha_inicio").notNull(),
  fechaFin: text("fecha_fin").notNull(),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
