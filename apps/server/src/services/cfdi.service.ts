/**
 * CFDI 4.0 Service
 *
 * Generates CFDI XML structure compliant with SAT's specifications.
 * Currently uses stub timbrado (UUID generation) — replace timbrar()
 * with real PAC integration (Finkok, SW Sapien, etc.) for production.
 */

import { randomUUID } from "crypto";

export interface CfdiEmisor {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
}

export interface CfdiReceptor {
  rfc: string;
  nombre: string;
  usoCfdi: string;
  domicilioFiscal: string;
  regimenFiscal: string;
}

export interface CfdiConcepto {
  claveProdServ: string;
  cantidad: number;
  claveUnidad: string;
  unidad: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento: number;
  tasaIva: number;
}

export interface CfdiData {
  serie: string;
  folio: string;
  fecha: string;
  formaPago: string;
  metodoPago: string;
  tipoDeComprobante: string;
  moneda: string;
  tipoCambio: string;
  lugarExpedicion: string;
  subtotal: number;
  descuento: number;
  total: number;
  emisor: CfdiEmisor;
  receptor: CfdiReceptor;
  conceptos: CfdiConcepto[];
}

export interface TimbradoResult {
  uuid: string;
  fechaTimbrado: string;
  selloSat: string;
  noCertificadoSat: string;
  xml: string;
}

/**
 * Generate CFDI 4.0 XML (pre-timbrado)
 */
export function generateCfdiXml(data: CfdiData): string {
  const ivaTraslados = data.conceptos.reduce(
    (sum, c) => sum + (c.importe - c.descuento) * c.tasaIva,
    0
  );
  const totalImpuestos = ivaTraslados;

  const conceptosXml = data.conceptos
    .map(
      (c) => `      <cfdi:Concepto
        ClaveProdServ="${c.claveProdServ}"
        Cantidad="${c.cantidad}"
        ClaveUnidad="${c.claveUnidad}"
        Unidad="${c.unidad}"
        Descripcion="${escapeXml(c.descripcion)}"
        ValorUnitario="${c.valorUnitario.toFixed(2)}"
        Importe="${c.importe.toFixed(2)}"${c.descuento > 0 ? `\n        Descuento="${c.descuento.toFixed(2)}"` : ""}
        ObjetoImp="02">
        <cfdi:Impuestos>
          <cfdi:Traslados>
            <cfdi:Traslado
              Base="${(c.importe - c.descuento).toFixed(2)}"
              Impuesto="002"
              TipoFactor="Tasa"
              TasaOCuota="${c.tasaIva.toFixed(6)}"
              Importe="${((c.importe - c.descuento) * c.tasaIva).toFixed(2)}" />
          </cfdi:Traslados>
        </cfdi:Impuestos>
      </cfdi:Concepto>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="${data.serie}"
  Folio="${data.folio}"
  Fecha="${data.fecha}"
  FormaPago="${data.formaPago}"
  MetodoPago="${data.metodoPago}"
  TipoDeComprobante="${data.tipoDeComprobante}"
  Moneda="${data.moneda}"
  TipoCambio="${data.tipoCambio}"
  LugarExpedicion="${data.lugarExpedicion}"
  SubTotal="${data.subtotal.toFixed(2)}"${data.descuento > 0 ? `\n  Descuento="${data.descuento.toFixed(2)}"` : ""}
  Total="${data.total.toFixed(2)}">
  <cfdi:Emisor
    Rfc="${data.emisor.rfc}"
    Nombre="${escapeXml(data.emisor.nombre)}"
    RegimenFiscal="${data.emisor.regimenFiscal}" />
  <cfdi:Receptor
    Rfc="${data.receptor.rfc}"
    Nombre="${escapeXml(data.receptor.nombre)}"
    UsoCFDI="${data.receptor.usoCfdi}"
    DomicilioFiscalReceptor="${data.receptor.domicilioFiscal}"
    RegimenFiscalReceptor="${data.receptor.regimenFiscal}" />
  <cfdi:Conceptos>
${conceptosXml}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${totalImpuestos.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado
        Base="${(data.subtotal - data.descuento).toFixed(2)}"
        Impuesto="002"
        TipoFactor="Tasa"
        TasaOCuota="0.160000"
        Importe="${totalImpuestos.toFixed(2)}" />
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;

  return xml;
}

/**
 * Stub: Timbrar CFDI via PAC
 *
 * In production, replace this with a real PAC call:
 * - Finkok: POST to https://facturacion.finkok.com/servicios/soap/stamp
 * - SW Sapien: POST to https://services.test.sw.com.mx/cfdi33/stamp/v4
 *
 * The PAC returns: UUID, FechaTimbrado, SelloCFD, SelloSAT, NoCertificadoSAT
 */
export async function timbrarCfdi(xml: string): Promise<TimbradoResult> {
  // STUB: Simulates PAC response
  const uuid = randomUUID().toUpperCase();
  const fechaTimbrado = new Date().toISOString().replace(/\.\d{3}Z$/, "");

  // In production, the PAC would return the signed XML with TimbreFiscalDigital
  const timbreXml = xml.replace(
    "</cfdi:Comprobante>",
    `  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${uuid}"
      FechaTimbrado="${fechaTimbrado}"
      SelloCFD="STUB_SELLO_CFD"
      SelloSAT="STUB_SELLO_SAT"
      NoCertificadoSAT="00001000000000000001"
      RfcProvCertif="PAC000000000" />
  </cfdi:Complemento>
</cfdi:Comprobante>`
  );

  return {
    uuid,
    fechaTimbrado,
    selloSat: "STUB_SELLO_SAT",
    noCertificadoSat: "00001000000000000001",
    xml: timbreXml,
  };
}

/**
 * Stub: Cancel CFDI via PAC
 */
export async function cancelarCfdi(
  uuid: string,
  rfcEmisor: string,
  motivo: string
): Promise<{ success: boolean; acuse?: string }> {
  // STUB: In production, call PAC cancellation endpoint
  return {
    success: true,
    acuse: `ACUSE-${uuid}-${Date.now()}`,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
