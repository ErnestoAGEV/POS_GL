export interface RegimenFiscalSat {
  clave: string;
  descripcion: string;
  personaFisica: boolean;
  personaMoral: boolean;
}

export const REGIMEN_FISCAL_SAT: RegimenFiscalSat[] = [
  { clave: "601", descripcion: "General de Ley Personas Morales", personaFisica: false, personaMoral: true },
  { clave: "603", descripcion: "Personas Morales con Fines no Lucrativos", personaFisica: false, personaMoral: true },
  { clave: "605", descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios", personaFisica: true, personaMoral: false },
  { clave: "606", descripcion: "Arrendamiento", personaFisica: true, personaMoral: false },
  { clave: "607", descripcion: "Régimen de Enajenación o Adquisición de Bienes", personaFisica: true, personaMoral: false },
  { clave: "608", descripcion: "Demás ingresos", personaFisica: true, personaMoral: false },
  { clave: "610", descripcion: "Residentes en el Extranjero sin Establecimiento Permanente en México", personaFisica: true, personaMoral: true },
  { clave: "611", descripcion: "Ingresos por Dividendos (socios y accionistas)", personaFisica: true, personaMoral: false },
  { clave: "612", descripcion: "Personas Físicas con Actividades Empresariales y Profesionales", personaFisica: true, personaMoral: false },
  { clave: "614", descripcion: "Ingresos por intereses", personaFisica: true, personaMoral: false },
  { clave: "615", descripcion: "Régimen de los ingresos por obtención de premios", personaFisica: true, personaMoral: false },
  { clave: "616", descripcion: "Sin obligaciones fiscales", personaFisica: true, personaMoral: false },
  { clave: "620", descripcion: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", personaFisica: false, personaMoral: true },
  { clave: "621", descripcion: "Incorporación Fiscal", personaFisica: true, personaMoral: false },
  { clave: "622", descripcion: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", personaFisica: true, personaMoral: true },
  { clave: "623", descripcion: "Opcional para Grupos de Sociedades", personaFisica: false, personaMoral: true },
  { clave: "624", descripcion: "Coordinados", personaFisica: false, personaMoral: true },
  { clave: "625", descripcion: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", personaFisica: true, personaMoral: false },
  { clave: "626", descripcion: "Régimen Simplificado de Confianza", personaFisica: true, personaMoral: true },
];
