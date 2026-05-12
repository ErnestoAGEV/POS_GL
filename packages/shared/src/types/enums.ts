export const UserRole = {
  ADMIN: "admin",
  CAJERO: "cajero",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const VentaTipo = {
  NORMAL: "normal",
  APARTADO: "apartado",
  COTIZACION: "cotizacion",
} as const;
export type VentaTipo = (typeof VentaTipo)[keyof typeof VentaTipo];

export const VentaEstado = {
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  EN_ESPERA: "en_espera",
  COTIZACION: "cotizacion",
} as const;
export type VentaEstado = (typeof VentaEstado)[keyof typeof VentaEstado];

export const FormaPagoInterna = {
  EFECTIVO: "efectivo",
  TARJETA: "tarjeta",
  TRANSFERENCIA: "transferencia",
  CREDITO: "credito",
  VALE_DESPENSA: "vale_despensa",
  TARJETA_REGALO: "tarjeta_regalo",
} as const;
export type FormaPagoInterna = (typeof FormaPagoInterna)[keyof typeof FormaPagoInterna];

export const CorteTipo = {
  PARCIAL: "parcial",
  FINAL: "final",
} as const;
export type CorteTipo = (typeof CorteTipo)[keyof typeof CorteTipo];

export const MovimientoCajaTipo = {
  ENTRADA: "entrada",
  SALIDA: "salida",
} as const;
export type MovimientoCajaTipo = (typeof MovimientoCajaTipo)[keyof typeof MovimientoCajaTipo];

export const TraspasoEstado = {
  PENDIENTE: "pendiente",
  EN_TRANSITO: "en_transito",
  RECIBIDO: "recibido",
  CANCELADO: "cancelado",
} as const;
export type TraspasoEstado = (typeof TraspasoEstado)[keyof typeof TraspasoEstado];

export const PromocionTipo = {
  DOS_POR_UNO: "2x1",
  N_POR_PRECIO: "nxprecio",
  PORCENTAJE: "porcentaje",
  MONTO_FIJO: "monto_fijo",
} as const;
export type PromocionTipo = (typeof PromocionTipo)[keyof typeof PromocionTipo];

export const FacturaTipo = {
  INDIVIDUAL: "individual",
  GLOBAL: "global",
  NOTA_CREDITO: "nota_credito",
  COMPLEMENTO: "complemento",
} as const;
export type FacturaTipo = (typeof FacturaTipo)[keyof typeof FacturaTipo];

export const FacturaEstado = {
  TIMBRADA: "timbrada",
  CANCELADA: "cancelada",
} as const;
export type FacturaEstado = (typeof FacturaEstado)[keyof typeof FacturaEstado];

export const ApartadoEstado = {
  ACTIVO: "activo",
  LIQUIDADO: "liquidado",
  CANCELADO: "cancelado",
} as const;
export type ApartadoEstado = (typeof ApartadoEstado)[keyof typeof ApartadoEstado];

export const SyncStatus = {
  PENDIENTE: "pendiente",
  SINCRONIZADO: "sincronizado",
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];
