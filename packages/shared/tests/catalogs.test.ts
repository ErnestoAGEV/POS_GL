import { describe, it, expect } from "vitest";
import { FORMAS_PAGO_SAT } from "../src/catalogs/formas-pago.js";
import { REGIMEN_FISCAL_SAT } from "../src/catalogs/regimen-fiscal.js";
import { USO_CFDI_SAT } from "../src/catalogs/uso-cfdi.js";
import { METODO_PAGO_SAT } from "../src/catalogs/metodo-pago.js";
import { MONEDA_SAT } from "../src/catalogs/moneda.js";
import { TIPO_COMPROBANTE_SAT } from "../src/catalogs/tipo-comprobante.js";

describe("SAT Catalogs", () => {
  it("should have formas de pago with unique claves", () => {
    expect(FORMAS_PAGO_SAT.length).toBeGreaterThan(10);
    const claves = FORMAS_PAGO_SAT.map((f) => f.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("should include common formas de pago", () => {
    const claves = FORMAS_PAGO_SAT.map((f) => f.clave);
    expect(claves).toContain("01");
    expect(claves).toContain("04");
    expect(claves).toContain("28");
    expect(claves).toContain("03");
    expect(claves).toContain("08");
  });

  it("should have regimen fiscal with unique claves", () => {
    expect(REGIMEN_FISCAL_SAT.length).toBeGreaterThan(10);
    const claves = REGIMEN_FISCAL_SAT.map((r) => r.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("should include RESICO (626)", () => {
    const resico = REGIMEN_FISCAL_SAT.find((r) => r.clave === "626");
    expect(resico).toBeDefined();
    expect(resico!.personaFisica).toBe(true);
    expect(resico!.personaMoral).toBe(true);
  });

  it("should have uso CFDI with unique claves", () => {
    expect(USO_CFDI_SAT.length).toBeGreaterThan(15);
    const claves = USO_CFDI_SAT.map((u) => u.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("should include G03 (Gastos en general)", () => {
    const g03 = USO_CFDI_SAT.find((u) => u.clave === "G03");
    expect(g03).toBeDefined();
    expect(g03!.personaFisica).toBe(true);
    expect(g03!.personaMoral).toBe(true);
  });

  it("should have metodo de pago PUE and PPD", () => {
    expect(METODO_PAGO_SAT).toHaveLength(2);
    const claves = METODO_PAGO_SAT.map((m) => m.clave);
    expect(claves).toContain("PUE");
    expect(claves).toContain("PPD");
  });

  it("should have MXN in moneda catalog", () => {
    const mxn = MONEDA_SAT.find((m) => m.clave === "MXN");
    expect(mxn).toBeDefined();
  });

  it("should have tipo comprobante I (Ingreso) and E (Egreso)", () => {
    const claves = TIPO_COMPROBANTE_SAT.map((t) => t.clave);
    expect(claves).toContain("I");
    expect(claves).toContain("E");
    expect(claves).toContain("P");
  });
});
