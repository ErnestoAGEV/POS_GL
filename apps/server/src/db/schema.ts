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

export const compras = pgTable("compras", {
  id: serial("id").primaryKey(),
  proveedorId: integer("proveedor_id")
    .notNull()
    .references(() => proveedores.id),
  sucursalId: integer("sucursal_id")
    .notNull()
    .references(() => sucursales.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  total: real("total").notNull(),
  estado: text("estado", { enum: ["pendiente", "recibida", "cancelada"] })
    .notNull()
    .default("pendiente"),
  notas: text("notas"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  fechaRecepcion: timestamp("fecha_recepcion", { withTimezone: true }),
  ...syncColumns,
  ...timestampColumns,
});

export const compraDetalles = pgTable("compra_detalles", {
  id: serial("id").primaryKey(),
  compraId: integer("compra_id")
    .notNull()
    .references(() => compras.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: real("cantidad").notNull(),
  costoUnitario: real("costo_unitario").notNull(),
  subtotal: real("subtotal").notNull(),
  ...syncColumns,
});

export const traspasos = pgTable("traspasos", {
  id: serial("id").primaryKey(),
  sucursalOrigenId: integer("sucursal_origen_id")
    .notNull()
    .references(() => sucursales.id),
  sucursalDestinoId: integer("sucursal_destino_id")
    .notNull()
    .references(() => sucursales.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  estado: text("estado", {
    enum: ["pendiente", "en_transito", "recibido", "cancelado"],
  })
    .notNull()
    .default("pendiente"),
  notas: text("notas"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
  ...timestampColumns,
});

export const traspasoDetalles = pgTable("traspaso_detalles", {
  id: serial("id").primaryKey(),
  traspasoId: integer("traspaso_id")
    .notNull()
    .references(() => traspasos.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: real("cantidad").notNull(),
  ...syncColumns,
});

export const cortesCaja = pgTable("cortes_caja", {
  id: serial("id").primaryKey(),
  terminalId: integer("terminal_id")
    .notNull()
    .references(() => terminales.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  tipo: text("tipo", { enum: ["parcial", "final"] }).notNull(),
  efectivoInicial: real("efectivo_inicial").notNull().default(0),
  efectivoSistema: real("efectivo_sistema").notNull().default(0),
  efectivoDeclarado: real("efectivo_declarado"),
  diferencia: real("diferencia"),
  totalVentas: real("total_ventas").notNull().default(0),
  totalEfectivo: real("total_efectivo").notNull().default(0),
  totalTarjeta: real("total_tarjeta").notNull().default(0),
  totalTransferencia: real("total_transferencia").notNull().default(0),
  totalOtros: real("total_otros").notNull().default(0),
  fechaApertura: timestamp("fecha_apertura", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fechaCierre: timestamp("fecha_cierre", { withTimezone: true }),
  ...syncColumns,
  ...timestampColumns,
});

export const movimientosCaja = pgTable("movimientos_caja", {
  id: serial("id").primaryKey(),
  corteId: integer("corte_id")
    .notNull()
    .references(() => cortesCaja.id),
  tipo: text("tipo", { enum: ["entrada", "salida"] }).notNull(),
  monto: real("monto").notNull(),
  concepto: text("concepto").notNull(),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
});

export const facturas = pgTable("facturas", {
  id: serial("id").primaryKey(),
  ventaIds: text("venta_ids").notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  uuidFiscal: text("uuid_fiscal"),
  xml: text("xml"),
  pdf: text("pdf"),
  tipo: text("tipo", {
    enum: ["individual", "global", "nota_credito", "complemento"],
  }).notNull(),
  estado: text("estado", { enum: ["timbrada", "cancelada"] })
    .notNull()
    .default("timbrada"),
  serieSat: text("serie_sat"),
  folioSat: text("folio_sat"),
  total: real("total").notNull().default(0),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
  ...timestampColumns,
});

export const promociones = pgTable("promociones", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", {
    enum: ["2x1", "nxprecio", "porcentaje", "monto_fijo"],
  }).notNull(),
  valor: real("valor").notNull(),
  precioObjetivo: real("precio_objetivo"),
  productoId: integer("producto_id").references(() => productos.id),
  categoriaId: integer("categoria_id").references(() => categorias.id),
  fechaInicio: timestamp("fecha_inicio", { withTimezone: true }).notNull(),
  fechaFin: timestamp("fecha_fin", { withTimezone: true }).notNull(),
  activa: boolean("activa").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const apartados = pgTable("apartados", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  clienteId: integer("cliente_id").references(() => clientes.id),
  enganche: real("enganche").notNull(),
  saldoPendiente: real("saldo_pendiente").notNull(),
  total: real("total").notNull(),
  estado: text("estado", {
    enum: ["activo", "liquidado", "cancelado"],
  })
    .notNull()
    .default("activo"),
  fechaLimite: timestamp("fecha_limite", { withTimezone: true }),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
  ...timestampColumns,
});

export const apartadoAbonos = pgTable("apartado_abonos", {
  id: serial("id").primaryKey(),
  apartadoId: integer("apartado_id")
    .notNull()
    .references(() => apartados.id),
  monto: real("monto").notNull(),
  formaPago: text("forma_pago", {
    enum: ["efectivo", "tarjeta", "transferencia"],
  }).notNull(),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
});

export const tarjetasRegalo = pgTable("tarjetas_regalo", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  saldo: real("saldo").notNull().default(0),
  clienteId: integer("cliente_id").references(() => clientes.id),
  activa: boolean("activa").notNull().default(true),
  ...syncColumns,
  ...timestampColumns,
});

export const tarjetaRegaloMovimientos = pgTable("tarjeta_regalo_movimientos", {
  id: serial("id").primaryKey(),
  tarjetaId: integer("tarjeta_id")
    .notNull()
    .references(() => tarjetasRegalo.id),
  tipo: text("tipo", { enum: ["carga", "consumo"] }).notNull(),
  monto: real("monto").notNull(),
  ventaId: integer("venta_id").references(() => ventas.id),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
});

export const devoluciones = pgTable("devoluciones", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  folio: text("folio").unique(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  motivo: text("motivo").notNull(),
  total: real("total").notNull(),
  itemsJson: text("items_json").notNull(),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
  ...timestampColumns,
});

export const bitacora = pgTable("bitacora", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  accion: text("accion").notNull(),
  entidad: text("entidad").notNull(),
  entidadId: integer("entidad_id"),
  descripcion: text("descripcion"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
});

export const configuracion = pgTable("configuracion", {
  id: serial("id").primaryKey(),
  clave: text("clave").notNull().unique(),
  valor: text("valor").notNull(),
  descripcion: text("descripcion"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
