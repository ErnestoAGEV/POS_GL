import { describe, it, expect } from "vitest";
import { generateInvoiceHtml } from "../cfdi-pdf.service.js";

const samplePdfData = {
  uuid: "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
  serie: "A",
  folio: "001",
  fecha: "2026-05-16T10:30:00",
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
  },
  conceptos: [
    {
      descripcion: "Producto de prueba",
      cantidad: 2,
      claveUnidad: "H87",
      valorUnitario: 500,
      importe: 1000,
      descuento: 50,
    },
  ],
  subtotal: 1000,
  descuento: 50,
  iva: 152,
  total: 1102,
  formaPago: "01",
  metodoPago: "PUE",
  selloSat: "SELLO_SAT_LARGO_AQUI_PARA_PRUEBA_SELLO_SAT_LARGO_AQUI_PARA_PRUEBA_1234567890",
  noCertificadoSat: "00001000000000000001",
  cadenaOriginal: "||1.1|A1B2C3D4|2026-05-16T10:30:00||CADENA_ORIGINAL_MAS_DATOS_AQUI_PARA_PRUEBA_1234567890",
};

describe("generateInvoiceHtml", () => {
  it("generates valid HTML document", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes UUID prominently", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("A1B2C3D4-E5F6-7890-ABCD-EF1234567890");
  });

  it("includes emisor information", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("EMP010101AAA");
    expect(html).toContain("Empresa Test SA de CV");
    expect(html).toContain("601");
  });

  it("includes receptor information", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("CLI020202BBB");
    expect(html).toContain("Cliente Test");
    expect(html).toContain("G03");
  });

  it("includes conceptos in table", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("Producto de prueba");
    expect(html).toContain("$500.00");
    expect(html).toContain("$1000.00");
  });

  it("includes totals", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("$1000.00"); // subtotal
    expect(html).toContain("$50.00"); // descuento
    expect(html).toContain("$152.00"); // iva
    expect(html).toContain("$1102.00"); // total
  });

  it("includes serie and folio in title", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("A-001");
  });

  it("includes CFDI disclaimer footer", () => {
    const html = generateInvoiceHtml(samplePdfData);

    expect(html).toContain("representacion impresa de un CFDI");
  });

  it("omits descuento row when descuento is 0", () => {
    const data = { ...samplePdfData, descuento: 0 };
    const html = generateInvoiceHtml(data);

    // Should not have a Descuento row in totals table
    expect(html).not.toContain("Descuento");
  });
});
