export interface TipoComprobanteSat {
  clave: string;
  descripcion: string;
}

export const TIPO_COMPROBANTE_SAT: TipoComprobanteSat[] = [
  { clave: "I", descripcion: "Ingreso" },
  { clave: "E", descripcion: "Egreso" },
  { clave: "T", descripcion: "Traslado" },
  { clave: "N", descripcion: "Nómina" },
  { clave: "P", descripcion: "Pago" },
];
