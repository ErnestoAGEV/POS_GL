export interface MetodoPagoSat {
  clave: string;
  descripcion: string;
}

export const METODO_PAGO_SAT: MetodoPagoSat[] = [
  { clave: "PUE", descripcion: "Pago en una sola exhibición" },
  { clave: "PPD", descripcion: "Pago en parcialidades o diferido" },
];
