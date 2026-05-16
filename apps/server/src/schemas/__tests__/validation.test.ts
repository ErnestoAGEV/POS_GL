import { describe, it, expect } from "vitest";
import {
  loginSchema,
  createVentaSchema,
  createFacturaSchema,
  createDevolucionSchema,
  createClienteSchema,
  createUsuarioSchema,
} from "../validation.js";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ username: "admin", password: "1234" });
    expect(result.success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = loginSchema.safeParse({ username: "", password: "1234" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({ username: "admin" });
    expect(result.success).toBe(false);
  });
});

describe("createVentaSchema", () => {
  const validVenta = {
    folio: "V-001",
    terminalId: 1,
    usuarioId: 1,
    subtotal: 100,
    descuento: 0,
    iva: 16,
    total: 116,
    tipo: "normal",
    estado: "completada",
    fecha: "2026-05-16T10:00:00",
    syncId: "abc-123",
    detalles: [
      { productoId: 1, cantidad: 2, precioUnitario: 50, descuento: 0, subtotal: 100, syncId: "d-1" },
    ],
    pagos: [
      { formaPago: "efectivo", monto: 116, syncId: "p-1" },
    ],
  };

  it("accepts valid sale", () => {
    const result = createVentaSchema.safeParse(validVenta);
    expect(result.success).toBe(true);
  });

  it("rejects negative total", () => {
    const result = createVentaSchema.safeParse({ ...validVenta, total: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects empty detalles", () => {
    const result = createVentaSchema.safeParse({ ...validVenta, detalles: [] });
    expect(result.success).toBe(false);
  });

  it("rejects empty pagos", () => {
    const result = createVentaSchema.safeParse({ ...validVenta, pagos: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid formaPago", () => {
    const result = createVentaSchema.safeParse({
      ...validVenta,
      pagos: [{ formaPago: "bitcoin", monto: 116, syncId: "p-1" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tipo", () => {
    const result = createVentaSchema.safeParse({ ...validVenta, tipo: "regalo" });
    expect(result.success).toBe(false);
  });

  it("accepts optional clienteId", () => {
    const result = createVentaSchema.safeParse({ ...validVenta, clienteId: 5 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.clienteId).toBe(5);
  });
});

describe("createFacturaSchema", () => {
  it("accepts valid factura", () => {
    const result = createFacturaSchema.safeParse({
      ventaIds: [1, 2],
      clienteId: 1,
      tipo: "individual",
      total: 500,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty ventaIds", () => {
    const result = createFacturaSchema.safeParse({
      ventaIds: [],
      clienteId: 1,
      tipo: "individual",
      total: 500,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tipo", () => {
    const result = createFacturaSchema.safeParse({
      ventaIds: [1],
      clienteId: 1,
      tipo: "recibo",
      total: 500,
    });
    expect(result.success).toBe(false);
  });
});

describe("createDevolucionSchema", () => {
  it("accepts valid devolucion", () => {
    const result = createDevolucionSchema.safeParse({
      ventaId: 1,
      motivo: "Producto defectuoso",
      items: [
        { productoId: 1, nombre: "Camisa", cantidad: 1, precioUnitario: 350, subtotal: 350 },
      ],
      total: 350,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty motivo", () => {
    const result = createDevolucionSchema.safeParse({
      ventaId: 1,
      motivo: "",
      items: [{ productoId: 1, nombre: "X", cantidad: 1, precioUnitario: 50, subtotal: 50 }],
      total: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects 0 quantity items", () => {
    const result = createDevolucionSchema.safeParse({
      ventaId: 1,
      motivo: "Devolucion",
      items: [{ productoId: 1, nombre: "X", cantidad: 0, precioUnitario: 50, subtotal: 0 }],
      total: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("createClienteSchema", () => {
  it("accepts valid client", () => {
    const result = createClienteSchema.safeParse({
      nombre: "Juan Perez",
      telefono: "5551234567",
      email: "juan@test.com",
      rfc: "PEPJ900101AAA",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty email string", () => {
    const result = createClienteSchema.safeParse({
      nombre: "Juan",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createClienteSchema.safeParse({
      nombre: "Juan",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty nombre", () => {
    const result = createClienteSchema.safeParse({ nombre: "" });
    expect(result.success).toBe(false);
  });
});

describe("createUsuarioSchema", () => {
  it("accepts valid user", () => {
    const result = createUsuarioSchema.safeParse({
      nombre: "Admin",
      username: "admin",
      password: "secreto",
      rol: "admin",
      sucursalId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects short username", () => {
    const result = createUsuarioSchema.safeParse({
      nombre: "X",
      username: "ab",
      password: "1234",
      rol: "cajero",
      sucursalId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid rol", () => {
    const result = createUsuarioSchema.safeParse({
      nombre: "X",
      username: "test",
      password: "1234",
      rol: "superadmin",
      sucursalId: 1,
    });
    expect(result.success).toBe(false);
  });
});
