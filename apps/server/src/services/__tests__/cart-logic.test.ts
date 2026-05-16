import { describe, it, expect } from "vitest";

/**
 * Tests for cart calculation logic (mirrors desktop cart-store.ts)
 * These validate the business rules for subtotal, discount, IVA, and total
 */

interface CartItem {
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  descuento: number;
  tasaIva: number;
  subtotal: number;
}

function calcSubtotal(precio: number, cantidad: number, descuento: number): number {
  return precio * cantidad - descuento;
}

function getSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.subtotal, 0);
}

function getDiscountTotal(items: CartItem[], descuentoGlobal: number): number {
  return items.reduce((sum, i) => sum + i.descuento, 0) + descuentoGlobal;
}

function getIva(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.subtotal * i.tasaIva, 0);
}

function getTotal(items: CartItem[], descuentoGlobal: number): number {
  return getSubtotal(items) + getIva(items) - descuentoGlobal;
}

describe("Cart calculations", () => {
  describe("calcSubtotal", () => {
    it("calculates basic subtotal", () => {
      expect(calcSubtotal(100, 3, 0)).toBe(300);
    });

    it("applies item discount", () => {
      expect(calcSubtotal(100, 3, 50)).toBe(250);
    });

    it("handles single item no discount", () => {
      expect(calcSubtotal(49.99, 1, 0)).toBeCloseTo(49.99);
    });

    it("discount can reduce to 0", () => {
      expect(calcSubtotal(100, 1, 100)).toBe(0);
    });
  });

  describe("getSubtotal", () => {
    it("sums all item subtotals", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 100, cantidad: 2, descuento: 0, tasaIva: 0.16, subtotal: 200 },
        { productoId: 2, nombre: "B", precioUnitario: 50, cantidad: 1, descuento: 10, tasaIva: 0.16, subtotal: 40 },
      ];
      expect(getSubtotal(items)).toBe(240);
    });

    it("returns 0 for empty cart", () => {
      expect(getSubtotal([])).toBe(0);
    });
  });

  describe("getDiscountTotal", () => {
    it("sums item discounts plus global", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 100, cantidad: 2, descuento: 20, tasaIva: 0.16, subtotal: 180 },
        { productoId: 2, nombre: "B", precioUnitario: 50, cantidad: 1, descuento: 5, tasaIva: 0.16, subtotal: 45 },
      ];
      expect(getDiscountTotal(items, 30)).toBe(55); // 20 + 5 + 30
    });

    it("returns only global when no item discounts", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 100, cantidad: 1, descuento: 0, tasaIva: 0.16, subtotal: 100 },
      ];
      expect(getDiscountTotal(items, 15)).toBe(15);
    });
  });

  describe("getIva", () => {
    it("calculates IVA at 16% on subtotals", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 100, cantidad: 1, descuento: 0, tasaIva: 0.16, subtotal: 100 },
      ];
      expect(getIva(items)).toBeCloseTo(16);
    });

    it("handles mixed IVA rates", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 100, cantidad: 1, descuento: 0, tasaIva: 0.16, subtotal: 100 },
        { productoId: 2, nombre: "B", precioUnitario: 200, cantidad: 1, descuento: 0, tasaIva: 0, subtotal: 200 }, // exempt
      ];
      expect(getIva(items)).toBeCloseTo(16); // only first item has IVA
    });

    it("IVA is calculated on post-discount subtotal", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 100, cantidad: 2, descuento: 50, tasaIva: 0.16, subtotal: 150 },
      ];
      expect(getIva(items)).toBeCloseTo(24); // 150 * 0.16
    });
  });

  describe("getTotal", () => {
    it("returns subtotal + IVA - global discount", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 100, cantidad: 1, descuento: 0, tasaIva: 0.16, subtotal: 100 },
      ];
      // subtotal=100, iva=16, global=10 => 106
      expect(getTotal(items, 10)).toBeCloseTo(106);
    });

    it("works with no global discount", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "A", precioUnitario: 200, cantidad: 1, descuento: 0, tasaIva: 0.16, subtotal: 200 },
      ];
      // subtotal=200, iva=32, global=0 => 232
      expect(getTotal(items, 0)).toBeCloseTo(232);
    });

    it("handles complex cart", () => {
      const items: CartItem[] = [
        { productoId: 1, nombre: "Camisa", precioUnitario: 350, cantidad: 2, descuento: 70, tasaIva: 0.16, subtotal: 630 },
        { productoId: 2, nombre: "Pantalon", precioUnitario: 500, cantidad: 1, descuento: 0, tasaIva: 0.16, subtotal: 500 },
        { productoId: 3, nombre: "Cinturon", precioUnitario: 150, cantidad: 1, descuento: 0, tasaIva: 0.16, subtotal: 150 },
      ];
      const descuentoGlobal = 50;
      // subtotal = 630 + 500 + 150 = 1280
      // iva = 1280 * 0.16 = 204.8
      // total = 1280 + 204.8 - 50 = 1434.8
      expect(getTotal(items, descuentoGlobal)).toBeCloseTo(1434.8);
    });
  });
});

describe("Credit limit enforcement", () => {
  function checkCreditLimit(
    saldoCredito: number,
    limiteCredito: number,
    montoNuevo: number
  ): { allowed: boolean; disponible: number } {
    const disponible = limiteCredito - saldoCredito;
    const newBalance = saldoCredito + montoNuevo;
    return {
      allowed: limiteCredito === 0 || newBalance <= limiteCredito,
      disponible: Math.max(0, disponible),
    };
  }

  it("allows credit within limit", () => {
    const result = checkCreditLimit(500, 5000, 1000);
    expect(result.allowed).toBe(true);
    expect(result.disponible).toBe(4500);
  });

  it("rejects credit exceeding limit", () => {
    const result = checkCreditLimit(4500, 5000, 600);
    expect(result.allowed).toBe(false);
    expect(result.disponible).toBe(500);
  });

  it("allows exact limit", () => {
    const result = checkCreditLimit(4000, 5000, 1000);
    expect(result.allowed).toBe(true);
  });

  it("allows unlimited when limit is 0", () => {
    const result = checkCreditLimit(10000, 0, 5000);
    expect(result.allowed).toBe(true);
  });

  it("correctly reports 0 disponible when at limit", () => {
    const result = checkCreditLimit(5000, 5000, 100);
    expect(result.allowed).toBe(false);
    expect(result.disponible).toBe(0);
  });
});

describe("Split payment validation", () => {
  function validateSplitPayment(
    pagos: Array<{ monto: number }>,
    total: number
  ): { valid: boolean; remaining: number; change: number } {
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
    const remaining = Math.max(0, total - totalPagado);
    const change = Math.max(0, totalPagado - total);
    return {
      valid: totalPagado >= total - 0.01,
      remaining,
      change,
    };
  }

  it("validates exact payment", () => {
    const result = validateSplitPayment(
      [{ monto: 500 }, { monto: 300 }],
      800
    );
    expect(result.valid).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.change).toBe(0);
  });

  it("validates overpayment and calculates change", () => {
    const result = validateSplitPayment([{ monto: 1000 }], 850);
    expect(result.valid).toBe(true);
    expect(result.change).toBeCloseTo(150);
  });

  it("rejects underpayment", () => {
    const result = validateSplitPayment(
      [{ monto: 200 }, { monto: 100 }],
      500
    );
    expect(result.valid).toBe(false);
    expect(result.remaining).toBeCloseTo(200);
  });

  it("handles floating point tolerance", () => {
    const result = validateSplitPayment(
      [{ monto: 33.33 }, { monto: 33.33 }, { monto: 33.33 }],
      99.99
    );
    expect(result.valid).toBe(true);
  });
});
