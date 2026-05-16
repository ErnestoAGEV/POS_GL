import { describe, it, expect } from "vitest";
import {
  generateCfdiXml,
  timbrarCfdi,
  cancelarCfdi,
  type CfdiData,
} from "../cfdi.service.js";

const sampleData: CfdiData = {
  serie: "A",
  folio: "001",
  fecha: "2026-05-16T10:30:00",
  formaPago: "01",
  metodoPago: "PUE",
  tipoDeComprobante: "I",
  moneda: "MXN",
  tipoCambio: "1",
  lugarExpedicion: "06600",
  subtotal: 1000,
  descuento: 50,
  total: 1102,
  emisor: {
    rfc: "EMP010101AAA",
    nombre: "Empresa Test SA de CV",
    regimenFiscal: "601",
  },
  receptor: {
    rfc: "CLI020202BBB",
    nombre: "Cliente Test",
    usoCfdi: "G03",
    domicilioFiscal: "06600",
    regimenFiscal: "616",
  },
  conceptos: [
    {
      claveProdServ: "43211501",
      cantidad: 2,
      claveUnidad: "H87",
      unidad: "Pieza",
      descripcion: "Producto de prueba",
      valorUnitario: 500,
      importe: 1000,
      descuento: 50,
      tasaIva: 0.16,
    },
  ],
};

describe("generateCfdiXml", () => {
  it("generates valid XML structure", () => {
    const xml = generateCfdiXml(sampleData);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('Version="4.0"');
    expect(xml).toContain("<cfdi:Comprobante");
    expect(xml).toContain("</cfdi:Comprobante>");
  });

  it("includes emisor data", () => {
    const xml = generateCfdiXml(sampleData);

    expect(xml).toContain('Rfc="EMP010101AAA"');
    expect(xml).toContain('Nombre="Empresa Test SA de CV"');
    expect(xml).toContain('RegimenFiscal="601"');
  });

  it("includes receptor data", () => {
    const xml = generateCfdiXml(sampleData);

    expect(xml).toContain('Rfc="CLI020202BBB"');
    expect(xml).toContain('Nombre="Cliente Test"');
    expect(xml).toContain('UsoCFDI="G03"');
    expect(xml).toContain('DomicilioFiscalReceptor="06600"');
    expect(xml).toContain('RegimenFiscalReceptor="616"');
  });

  it("includes concepto with correct values", () => {
    const xml = generateCfdiXml(sampleData);

    expect(xml).toContain('ClaveProdServ="43211501"');
    expect(xml).toContain('Cantidad="2"');
    expect(xml).toContain('ClaveUnidad="H87"');
    expect(xml).toContain('Descripcion="Producto de prueba"');
    expect(xml).toContain('ValorUnitario="500.00"');
    expect(xml).toContain('Importe="1000.00"');
    expect(xml).toContain('Descuento="50.00"');
  });

  it("calculates IVA correctly", () => {
    const xml = generateCfdiXml(sampleData);

    // Base = 1000 - 50 = 950, IVA = 950 * 0.16 = 152
    expect(xml).toContain('Base="950.00"');
    expect(xml).toContain('Importe="152.00"');
    expect(xml).toContain('TotalImpuestosTrasladados="152.00"');
  });

  it("includes descuento when greater than 0", () => {
    const xml = generateCfdiXml(sampleData);
    expect(xml).toContain('Descuento="50.00"');
  });

  it("omits descuento when 0", () => {
    const data = {
      ...sampleData,
      descuento: 0,
      conceptos: [{ ...sampleData.conceptos[0], descuento: 0 }],
    };
    const xml = generateCfdiXml(data);
    // Comprobante level should not have Descuento attribute
    const comprobanteMatch = xml.match(/<cfdi:Comprobante[^>]*>/);
    expect(comprobanteMatch?.[0]).not.toContain("Descuento=");
  });

  it("escapes XML special characters in names", () => {
    const data = {
      ...sampleData,
      emisor: { ...sampleData.emisor, nombre: "Test & Co <Inc>" },
    };
    const xml = generateCfdiXml(data);

    expect(xml).toContain("Test &amp; Co &lt;Inc&gt;");
    expect(xml).not.toContain("Test & Co <Inc>");
  });

  it("handles multiple conceptos", () => {
    const data: CfdiData = {
      ...sampleData,
      subtotal: 1500,
      total: 1652,
      conceptos: [
        { ...sampleData.conceptos[0], importe: 1000 },
        {
          claveProdServ: "01010101",
          cantidad: 1,
          claveUnidad: "E48",
          unidad: "Servicio",
          descripcion: "Servicio extra",
          valorUnitario: 500,
          importe: 500,
          descuento: 0,
          tasaIva: 0.16,
        },
      ],
    };
    const xml = generateCfdiXml(data);

    expect(xml).toContain('Descripcion="Producto de prueba"');
    expect(xml).toContain('Descripcion="Servicio extra"');
  });
});

describe("timbrarCfdi", () => {
  it("returns UUID in uppercase format", async () => {
    const result = await timbrarCfdi("<xml>test</xml>");

    expect(result.uuid).toMatch(
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/
    );
  });

  it("returns fechaTimbrado as ISO-like string", async () => {
    const result = await timbrarCfdi("<xml>test</xml>");

    expect(result.fechaTimbrado).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("returns XML with TimbreFiscalDigital complement", async () => {
    const xml = generateCfdiXml(sampleData);
    const result = await timbrarCfdi(xml);

    expect(result.xml).toContain("tfd:TimbreFiscalDigital");
    expect(result.xml).toContain(`UUID="${result.uuid}"`);
    expect(result.xml).toContain("cfdi:Complemento");
  });

  it("generates unique UUIDs per call", async () => {
    const r1 = await timbrarCfdi("<xml>1</xml>");
    const r2 = await timbrarCfdi("<xml>2</xml>");

    expect(r1.uuid).not.toBe(r2.uuid);
  });
});

describe("cancelarCfdi", () => {
  it("returns success with acuse", async () => {
    const result = await cancelarCfdi("UUID-TEST", "RFC-TEST", "02");

    expect(result.success).toBe(true);
    expect(result.acuse).toBeDefined();
    expect(result.acuse).toContain("UUID-TEST");
  });
});
