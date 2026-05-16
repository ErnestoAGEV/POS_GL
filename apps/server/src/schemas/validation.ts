import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

// ── Ventas ────────────────────────────────────────────────────────────
export const ventaDetalleSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().positive(),
  precioUnitario: z.number().nonnegative(),
  descuento: z.number().nonnegative().default(0),
  subtotal: z.number().nonnegative(),
  syncId: z.string().min(1),
});

export const ventaPagoSchema = z.object({
  formaPago: z.enum(["efectivo", "tarjeta", "transferencia", "credito", "vale_despensa", "tarjeta_regalo"]),
  monto: z.number().positive(),
  referencia: z.string().optional(),
  syncId: z.string().min(1),
});

export const createVentaSchema = z.object({
  folio: z.string().min(1).max(50),
  terminalId: z.number().int().positive(),
  usuarioId: z.number().int().positive(),
  clienteId: z.number().int().positive().optional(),
  subtotal: z.number().nonnegative(),
  descuento: z.number().nonnegative(),
  iva: z.number().nonnegative(),
  total: z.number().nonnegative(),
  tipo: z.enum(["normal", "apartado", "cotizacion"]),
  estado: z.enum(["completada", "cancelada", "pendiente"]),
  fecha: z.string().min(1),
  syncId: z.string().min(1),
  detalles: z.array(ventaDetalleSchema).min(1),
  pagos: z.array(ventaPagoSchema).min(1),
});

// ── Facturas ──────────────────────────────────────────────────────────
export const createFacturaSchema = z.object({
  ventaIds: z.array(z.number().int().positive()).min(1),
  clienteId: z.number().int().positive(),
  tipo: z.enum(["individual", "global", "nota_credito", "complemento"]),
  total: z.number().positive(),
});

export const cancelarFacturaSchema = z.object({
  motivo: z.string().max(200).optional(),
});

// ── Devoluciones ──────────────────────────────────────────────────────
export const devolucionItemSchema = z.object({
  productoId: z.number().int().positive(),
  nombre: z.string().min(1),
  cantidad: z.number().positive(),
  precioUnitario: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const createDevolucionSchema = z.object({
  ventaId: z.number().int().positive(),
  motivo: z.string().min(1).max(500),
  items: z.array(devolucionItemSchema).min(1),
  total: z.number().positive(),
});

// ── Productos ─────────────────────────────────────────────────────────
export const createProductoSchema = z.object({
  nombre: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  codigoBarras: z.string().max(50).optional(),
  precioVenta: z.number().nonnegative(),
  costo: z.number().nonnegative().optional(),
  categoriaId: z.number().int().positive().optional(),
  stockMinimo: z.number().int().nonnegative().default(0),
  claveSat: z.string().max(20).optional(),
  unidadSat: z.string().max(10).optional(),
  tasaIva: z.number().min(0).max(1).default(0.16),
});

// ── Clientes ──────────────────────────────────────────────────────────
export const createClienteSchema = z.object({
  nombre: z.string().min(1).max(200),
  telefono: z.string().max(20).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  rfc: z.string().max(13).optional(),
  razonSocial: z.string().max(300).optional(),
  regimenFiscal: z.string().max(5).optional(),
  usoCfdi: z.string().max(5).optional(),
  domicilioFiscal: z.string().max(10).optional(),
  limiteCredito: z.number().nonnegative().default(0),
});

// ── Usuarios ──────────────────────────────────────────────────────────
export const createUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
  username: z.string().min(3).max(50),
  password: z.string().min(4).max(200),
  rol: z.enum(["admin", "cajero"]),
  sucursalId: z.number().int().positive(),
});

export const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  password: z.string().min(4).max(200).optional(),
  rol: z.enum(["admin", "cajero"]).optional(),
  sucursalId: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
});

// ── Sucursales ────────────────────────────────────────────────────────
export const createSucursalSchema = z.object({
  nombre: z.string().min(1).max(100),
  direccion: z.string().max(300).optional(),
  telefono: z.string().max(20).optional(),
  rfc: z.string().max(13).optional(),
  razonSocial: z.string().max(300).optional(),
  regimenFiscal: z.string().max(5).optional(),
  codigoPostal: z.string().max(10).optional(),
});

// ── Compras ───────────────────────────────────────────────────────────
export const createCompraSchema = z.object({
  proveedorId: z.number().int().positive(),
  sucursalId: z.number().int().positive(),
  total: z.number().nonnegative(),
  notas: z.string().max(500).optional(),
  items: z.array(
    z.object({
      productoId: z.number().int().positive(),
      cantidad: z.number().positive(),
      costoUnitario: z.number().nonnegative(),
      subtotal: z.number().nonnegative(),
    })
  ).min(1),
});

// ── Traspasos ─────────────────────────────────────────────────────────
export const createTraspasoSchema = z.object({
  sucursalOrigenId: z.number().int().positive(),
  sucursalDestinoId: z.number().int().positive(),
  notas: z.string().max(500).optional(),
  items: z.array(
    z.object({
      productoId: z.number().int().positive(),
      cantidad: z.number().positive(),
    })
  ).min(1),
});

// ── Promociones ───────────────────────────────────────────────────────
export const createPromocionSchema = z.object({
  nombre: z.string().min(1).max(100),
  tipo: z.enum(["porcentaje", "monto_fijo", "precio_especial", "2x1", "3x2"]),
  valor: z.number().nonnegative(),
  precioObjetivo: z.number().nonnegative().optional(),
  productoId: z.number().int().positive().optional(),
  categoriaId: z.number().int().positive().optional(),
  fechaInicio: z.string().min(1),
  fechaFin: z.string().min(1),
});
