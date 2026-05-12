export interface UsoCfdiSat {
  clave: string;
  descripcion: string;
  personaFisica: boolean;
  personaMoral: boolean;
}

export const USO_CFDI_SAT: UsoCfdiSat[] = [
  { clave: "G01", descripcion: "Adquisición de mercancías", personaFisica: true, personaMoral: true },
  { clave: "G02", descripcion: "Devoluciones, descuentos o bonificaciones", personaFisica: true, personaMoral: true },
  { clave: "G03", descripcion: "Gastos en general", personaFisica: true, personaMoral: true },
  { clave: "I01", descripcion: "Construcciones", personaFisica: true, personaMoral: true },
  { clave: "I02", descripcion: "Mobiliario y equipo de oficina por inversiones", personaFisica: true, personaMoral: true },
  { clave: "I03", descripcion: "Equipo de transporte", personaFisica: true, personaMoral: true },
  { clave: "I04", descripcion: "Equipo de cómputo y accesorios", personaFisica: true, personaMoral: true },
  { clave: "I05", descripcion: "Dados, troqueles, moldes, matrices y herramental", personaFisica: true, personaMoral: true },
  { clave: "I06", descripcion: "Comunicaciones telefónicas", personaFisica: true, personaMoral: true },
  { clave: "I07", descripcion: "Comunicaciones satelitales", personaFisica: true, personaMoral: true },
  { clave: "I08", descripcion: "Otra maquinaria y equipo", personaFisica: true, personaMoral: true },
  { clave: "D01", descripcion: "Honorarios médicos, dentales y gastos hospitalarios", personaFisica: true, personaMoral: false },
  { clave: "D02", descripcion: "Gastos médicos por incapacidad o discapacidad", personaFisica: true, personaMoral: false },
  { clave: "D03", descripcion: "Gastos funerales", personaFisica: true, personaMoral: false },
  { clave: "D04", descripcion: "Donativos", personaFisica: true, personaMoral: false },
  { clave: "D05", descripcion: "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)", personaFisica: true, personaMoral: false },
  { clave: "D06", descripcion: "Aportaciones voluntarias al SAR", personaFisica: true, personaMoral: false },
  { clave: "D07", descripcion: "Primas por seguros de gastos médicos", personaFisica: true, personaMoral: false },
  { clave: "D08", descripcion: "Gastos de transportación escolar obligatoria", personaFisica: true, personaMoral: false },
  { clave: "D09", descripcion: "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones", personaFisica: true, personaMoral: false },
  { clave: "D10", descripcion: "Pagos por servicios educativos (colegiaturas)", personaFisica: true, personaMoral: false },
  { clave: "S01", descripcion: "Sin efectos fiscales", personaFisica: true, personaMoral: true },
  { clave: "CP01", descripcion: "Pagos", personaFisica: true, personaMoral: true },
  { clave: "CN01", descripcion: "Nómina", personaFisica: true, personaMoral: false },
];
