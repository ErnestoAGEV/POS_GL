import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Shared column helpers ─────────────────────────────────────────────────────

const syncColumns = {
  syncId: text("sync_id")
    .notNull()
    .unique()
    .default(sql`gen_random_uuid()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
  syncStatus: text("sync_status", { enum: ["pendiente", "sincronizado"] })
    .notNull()
    .default("pendiente"),
};

const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// ── Tables ────────────────────────────────────────────────────────────────────

export const sucursales = pgTable("sucursales", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion"),
  telefono: text("telefono"),
  rfc: text("rfc"),
  razonSocial: text("razon_social"),
  regimenFiscal: text("regimen_fiscal"),
  codigoPostal: text("codigo_postal"),
  activa: boolean("activa").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const terminales = pgTable("terminales", {
  id: serial("id").primaryKey(),
  sucursalId: integer("sucursal_id")
    .notNull()
    .references(() => sucursales.id),
  nombre: text("nombre").notNull(),
  activa: boolean("activa").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["admin", "cajero"] }).notNull(),
  sucursalId: integer("sucursal_id")
    .notNull()
    .references(() => sucursales.id),
  activo: boolean("activo").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  categoriaPadreId: integer("categoria_padre_id").references(
    (): any => categorias.id
  ),
  activa: boolean("activa").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const productos = pgTable("productos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  sku: text("sku").unique(),
  codigoBarras: text("codigo_barras").unique(),
  precioVenta: real("precio_venta").notNull(),
  costo: real("costo").notNull().default(0),
  categoriaId: integer("categoria_id").references(() => categorias.id),
  stockMinimo: integer("stock_minimo").notNull().default(0),
  claveSat: text("clave_sat"),
  unidadSat: text("unidad_sat"),
  tasaIva: real("tasa_iva").notNull().default(0.16),
  activo: boolean("activo").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const stockSucursal = pgTable(
  "stock_sucursal",
  {
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    sucursalId: integer("sucursal_id")
      .notNull()
      .references(() => sucursales.id),
    cantidad: real("cantidad").notNull().default(0),
    ...syncColumns,
  },
  (table) => [primaryKey({ columns: [table.productoId, table.sucursalId] })]
);

export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  telefono: text("telefono"),
  email: text("email"),
  rfc: text("rfc"),
  razonSocial: text("razon_social"),
  regimenFiscal: text("regimen_fiscal"),
  usoCfdi: text("uso_cfdi"),
  domicilioFiscal: text("domicilio_fiscal"),
  limiteCredito: real("limite_credito").notNull().default(0),
  saldoCredito: real("saldo_credito").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const proveedores = pgTable("proveedores", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  contacto: text("contacto"),
  telefono: text("telefono"),
  email: text("email"),
  rfc: text("rfc"),
  activo: boolean("activo").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const ventas = pgTable("ventas", {
  id: serial("id").primaryKey(),
  folio: text("folio").unique(),
  terminalId: integer("terminal_id")
    .notNull()
    .references(() => terminales.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  clienteId: integer("cliente_id").references(() => clientes.id),
  subtotal: real("subtotal").notNull(),
  descuento: real("descuento").notNull().default(0),
  iva: real("iva").notNull(),
  total: real("total").notNull(),
  tipo: text("tipo", { enum: ["normal", "apartado", "cotizacion"] })
    .notNull()
    .default("normal"),
  estado: text("estado", {
    enum: ["completada", "cancelada", "en_espera", "cotizacion"],
  })
    .notNull()
    .default("completada"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
  ...timestampColumns,
});

export const ventaDetalles = pgTable("venta_detalles", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: real("cantidad").notNull(),
  precioUnitario: real("precio_unitario").notNull(),
  descuento: real("descuento").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  ...syncColumns,
});

export const pagos = pgTable("pagos", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  formaPago: text("forma_pago", {
    enum: [
      "efectivo",
      "tarjeta",
      "transferencia",
      "credito",
      "vale_despensa",
      "tarjeta_regalo",
    ],
  }).notNull(),
  monto: real("monto").notNull(),
  referencia: text("referencia"),
  ...syncColumns,
});
