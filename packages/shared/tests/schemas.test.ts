import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "../src/schemas/index.js";

describe("Database schemas", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

    sqlite.exec(`
      CREATE TABLE sucursales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        direccion TEXT,
        telefono TEXT,
        rfc TEXT,
        razon_social TEXT,
        regimen_fiscal TEXT,
        codigo_postal TEXT,
        activa INTEGER NOT NULL DEFAULT 1,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE terminales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
        nombre TEXT NOT NULL,
        activa INTEGER NOT NULL DEFAULT 1,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL,
        sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
        activo INTEGER NOT NULL DEFAULT 1,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        categoria_padre_id INTEGER REFERENCES categorias(id),
        activa INTEGER NOT NULL DEFAULT 1,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        sku TEXT UNIQUE,
        codigo_barras TEXT UNIQUE,
        precio_venta REAL NOT NULL,
        costo REAL NOT NULL DEFAULT 0,
        categoria_id INTEGER REFERENCES categorias(id),
        stock_minimo INTEGER NOT NULL DEFAULT 0,
        clave_sat TEXT,
        unidad_sat TEXT,
        tasa_iva REAL NOT NULL DEFAULT 0.16,
        activo INTEGER NOT NULL DEFAULT 1,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE stock_sucursal (
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
        cantidad REAL NOT NULL DEFAULT 0,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        PRIMARY KEY (producto_id, sucursal_id)
      );

      CREATE TABLE clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        rfc TEXT,
        razon_social TEXT,
        regimen_fiscal TEXT,
        uso_cfdi TEXT,
        domicilio_fiscal TEXT,
        limite_credito REAL NOT NULL DEFAULT 0,
        saldo_credito REAL NOT NULL DEFAULT 0,
        activo INTEGER NOT NULL DEFAULT 1,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE proveedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        contacto TEXT,
        telefono TEXT,
        email TEXT,
        rfc TEXT,
        activo INTEGER NOT NULL DEFAULT 1,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio TEXT NOT NULL UNIQUE,
        terminal_id INTEGER NOT NULL REFERENCES terminales(id),
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        cliente_id INTEGER REFERENCES clientes(id),
        subtotal REAL NOT NULL,
        descuento REAL NOT NULL DEFAULT 0,
        iva REAL NOT NULL,
        total REAL NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'normal',
        estado TEXT NOT NULL DEFAULT 'completada',
        fecha TEXT NOT NULL,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TEXT NOT NULL
      );

      CREATE TABLE venta_detalles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL REFERENCES ventas(id),
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        cantidad REAL NOT NULL,
        precio_unitario REAL NOT NULL,
        descuento REAL NOT NULL DEFAULT 0,
        subtotal REAL NOT NULL,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente'
      );

      CREATE TABLE pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL REFERENCES ventas(id),
        forma_pago TEXT NOT NULL,
        monto REAL NOT NULL,
        referencia TEXT,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente'
      );

      CREATE TABLE bitacora (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        accion TEXT NOT NULL,
        entidad TEXT NOT NULL,
        entidad_id INTEGER,
        descripcion TEXT,
        fecha TEXT NOT NULL,
        sync_id TEXT NOT NULL UNIQUE,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pendiente'
      );
    `);
  });

  afterAll(() => {
    sqlite.close();
  });

  it("should insert and query a sucursal", async () => {
    const result = db
      .insert(schema.sucursales)
      .values({
        nombre: "Sucursal Centro",
        direccion: "Av. Reforma 100",
        telefono: "5551234567",
      })
      .returning()
      .get();

    expect(result.nombre).toBe("Sucursal Centro");
    expect(result.syncId).toBeDefined();
    expect(result.syncStatus).toBe("pendiente");
    expect(result.activa).toBe(true);
  });

  it("should insert and query a producto", async () => {
    const result = db
      .insert(schema.productos)
      .values({
        nombre: "Coca-Cola 600ml",
        sku: "CC600",
        codigoBarras: "7501055300120",
        precioVenta: 18.5,
        costo: 12.0,
        tasaIva: 0.16,
      })
      .returning()
      .get();

    expect(result.nombre).toBe("Coca-Cola 600ml");
    expect(result.precioVenta).toBe(18.5);
    expect(result.tasaIva).toBe(0.16);
    expect(result.activo).toBe(true);
  });

  it("should insert a venta with detalles and pago", async () => {
    const sucursal = db
      .insert(schema.sucursales)
      .values({ nombre: "Test Sucursal" })
      .returning()
      .get();

    const terminal = db
      .insert(schema.terminales)
      .values({ nombre: "Caja 1", sucursalId: sucursal.id })
      .returning()
      .get();

    const usuario = db
      .insert(schema.usuarios)
      .values({
        nombre: "Juan Cajero",
        username: "juan",
        passwordHash: "hash123",
        rol: "cajero",
        sucursalId: sucursal.id,
      })
      .returning()
      .get();

    const venta = db
      .insert(schema.ventas)
      .values({
        folio: "V-001",
        terminalId: terminal.id,
        usuarioId: usuario.id,
        subtotal: 100,
        iva: 16,
        total: 116,
      })
      .returning()
      .get();

    expect(venta.folio).toBe("V-001");
    expect(venta.total).toBe(116);
    expect(venta.tipo).toBe("normal");
    expect(venta.estado).toBe("completada");

    const pago = db
      .insert(schema.pagos)
      .values({
        ventaId: venta.id,
        formaPago: "efectivo",
        monto: 116,
      })
      .returning()
      .get();

    expect(pago.formaPago).toBe("efectivo");
    expect(pago.monto).toBe(116);
  });

  it("should insert a bitacora entry", async () => {
    const entries = db.select().from(schema.usuarios).all();
    const userId = entries[0].id;

    const log = db
      .insert(schema.bitacora)
      .values({
        usuarioId: userId,
        accion: "venta_creada",
        entidad: "venta",
        entidadId: 1,
        descripcion: "Venta V-001 creada por $116.00",
      })
      .returning()
      .get();

    expect(log.accion).toBe("venta_creada");
    expect(log.entidad).toBe("venta");
  });
});
