// apps/desktop/src/main/ipc-handlers.ts

import { IpcMain, BrowserWindow } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, like, or } from "drizzle-orm";
import * as schema from "@posgl/shared/schemas";
import { join } from "path";
import { app } from "electron";
import { randomUUID } from "crypto";
import { SyncService } from "./sync-service.js";
import { printTicket, formatTicketText, setPrinterConfig, getPrinterConfig } from "./ticket-printer.js";

const dbPath = join(app.getPath("userData"), "posgl.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    sku TEXT UNIQUE,
    codigo_barras TEXT UNIQUE,
    precio_venta REAL NOT NULL,
    costo REAL NOT NULL DEFAULT 0,
    categoria_id INTEGER,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    clave_sat TEXT,
    unidad_sat TEXT,
    tasa_iva REAL NOT NULL DEFAULT 0.16,
    activo INTEGER NOT NULL DEFAULT 1,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria_padre_id INTEGER,
    activa INTEGER NOT NULL DEFAULT 1,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT UNIQUE,
    terminal_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER,
    subtotal REAL NOT NULL,
    descuento REAL NOT NULL DEFAULT 0,
    iva REAL NOT NULL,
    total REAL NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'normal',
    estado TEXT NOT NULL DEFAULT 'completada',
    fecha TEXT NOT NULL,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS venta_detalles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id),
    producto_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    descuento REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id),
    forma_pago TEXT NOT NULL,
    monto REAL NOT NULL,
    referencia TEXT,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS cortes_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    terminal_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'parcial',
    efectivo_inicial REAL NOT NULL DEFAULT 0,
    efectivo_sistema REAL NOT NULL DEFAULT 0,
    efectivo_declarado REAL,
    diferencia REAL,
    total_ventas REAL NOT NULL DEFAULT 0,
    total_efectivo REAL NOT NULL DEFAULT 0,
    total_tarjeta REAL NOT NULL DEFAULT 0,
    total_transferencia REAL NOT NULL DEFAULT 0,
    total_otros REAL NOT NULL DEFAULT 0,
    fecha_apertura TEXT NOT NULL,
    fecha_cierre TEXT,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS movimientos_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corte_id INTEGER NOT NULL REFERENCES cortes_caja(id),
    tipo TEXT NOT NULL,
    monto REAL NOT NULL,
    concepto TEXT NOT NULL,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_ids TEXT NOT NULL,
    cliente_id INTEGER,
    uuid_fiscal TEXT,
    xml TEXT,
    pdf TEXT,
    tipo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'timbrada',
    serie_sat TEXT,
    folio_sat TEXT,
    total REAL NOT NULL DEFAULT 0,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS promociones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    valor REAL NOT NULL,
    precio_objetivo REAL,
    producto_id INTEGER,
    categoria_id INTEGER,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    activa INTEGER NOT NULL DEFAULT 1,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bitacora (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id INTEGER,
    descripcion TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS apartados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id),
    cliente_id INTEGER,
    enganche REAL NOT NULL,
    saldo_pendiente REAL NOT NULL,
    total REAL NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activo',
    fecha_limite TEXT,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS apartado_abonos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apartado_id INTEGER NOT NULL REFERENCES apartados(id),
    monto REAL NOT NULL,
    forma_pago TEXT NOT NULL,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS tarjetas_regalo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    saldo REAL NOT NULL DEFAULT 0,
    cliente_id INTEGER,
    activa INTEGER NOT NULL DEFAULT 1,
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tarjeta_regalo_movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarjeta_id INTEGER NOT NULL REFERENCES tarjetas_regalo(id),
    tipo TEXT NOT NULL,
    monto REAL NOT NULL,
    venta_id INTEGER,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS ventas_espera (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL DEFAULT 'Venta en espera',
    terminal_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER,
    items_json TEXT NOT NULL,
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS devoluciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id),
    folio TEXT UNIQUE,
    usuario_id INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    total REAL NOT NULL,
    items_json TEXT NOT NULL,
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    sync_id TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente'
  );

  CREATE TABLE IF NOT EXISTS clientes (
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
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const db = drizzle(sqlite, { schema });

let syncService: SyncService | null = null;
let mainWindow: BrowserWindow | null = null;
let folioCounter = 0;

function generateFolio(terminalId: number): string {
  folioCounter++;
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `T${terminalId}-${ymd}-${String(folioCounter).padStart(5, "0")}`;
}

export function setMainWindow(win: BrowserWindow) {
  mainWindow = win;
}

export function registerIpcHandlers(ipcMain: IpcMain) {
  // ── Auth ──────────────────────────────────────────────────────────────
  ipcMain.handle(
    "auth:login",
    async (
      _event,
      credentials: { username: string; password: string; serverUrl: string }
    ) => {
      try {
        const response = await fetch(`${credentials.serverUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          return { success: false, error: err.message || "Credenciales invalidas" };
        }

        const { token, user } = await response.json();

        syncService = new SyncService({
          serverUrl: credentials.serverUrl,
          token,
          terminalId: 1,
          sucursalId: user.sucursalId,
          db,
          sqlite,
          mainWindow,
        });

        syncService.connect();
        syncService.downloadCatalog();

        return { success: true, user, token };
      } catch {
        return {
          success: true,
          offline: true,
          user: {
            id: 0,
            nombre: credentials.username,
            username: credentials.username,
            rol: "cajero",
            sucursalId: 1,
          },
        };
      }
    }
  );

  ipcMain.handle("auth:logout", async () => {
    syncService?.disconnect();
    syncService = null;
    return { success: true };
  });

  // ── Products ──────────────────────────────────────────────────────────
  ipcMain.handle("products:search", async (_event, query: string) => {
    if (!query || query.trim().length === 0) {
      return db
        .select()
        .from(schema.productos)
        .where(eq(schema.productos.activo, true))
        .limit(20)
        .all();
    }
    return db
      .select()
      .from(schema.productos)
      .where(
        or(
          like(schema.productos.nombre, `%${query}%`),
          like(schema.productos.sku, `%${query}%`),
          eq(schema.productos.codigoBarras, query)
        )
      )
      .limit(20)
      .all();
  });

  ipcMain.handle("products:barcode", async (_event, code: string) => {
    return db
      .select()
      .from(schema.productos)
      .where(eq(schema.productos.codigoBarras, code))
      .limit(1)
      .all()
      .then((rows) => rows[0] || null);
  });

  // ── Categories ────────────────────────────────────────────────────────
  ipcMain.handle("categories:list", async () => {
    return db
      .select()
      .from(schema.categorias)
      .where(eq(schema.categorias.activa, true))
      .all();
  });

  // ── Sales ─────────────────────────────────────────────────────────────
  ipcMain.handle(
    "ventas:create",
    async (
      _event,
      sale: {
        terminalId: number;
        usuarioId: number;
        clienteId?: number;
        subtotal: number;
        descuento: number;
        iva: number;
        total: number;
        items: Array<{
          productoId: number;
          nombre: string;
          cantidad: number;
          precioUnitario: number;
          descuento: number;
          subtotal: number;
        }>;
        pagos: Array<{
          formaPago: string;
          monto: number;
          referencia?: string;
        }>;
      }
    ) => {
      const folio = generateFolio(sale.terminalId);
      const ventaSyncId = randomUUID();
      const fecha = new Date().toISOString();

      const ventaResult = db
        .insert(schema.ventas)
        .values({
          folio,
          terminalId: sale.terminalId,
          usuarioId: sale.usuarioId,
          clienteId: sale.clienteId || null,
          subtotal: sale.subtotal,
          descuento: sale.descuento,
          iva: sale.iva,
          total: sale.total,
          tipo: "normal",
          estado: "completada",
          fecha,
          syncId: ventaSyncId,
          syncStatus: "pendiente",
        })
        .run();

      const ventaId = Number(ventaResult.lastInsertRowid);

      for (const item of sale.items) {
        db.insert(schema.ventaDetalles)
          .values({
            ventaId,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            subtotal: item.subtotal,
            syncId: randomUUID(),
            syncStatus: "pendiente",
          })
          .run();
      }

      for (const pago of sale.pagos) {
        db.insert(schema.pagos)
          .values({
            ventaId,
            formaPago: pago.formaPago as any,
            monto: pago.monto,
            referencia: pago.referencia || null,
            syncId: randomUUID(),
            syncStatus: "pendiente",
          })
          .run();
      }

      syncService?.flushPendingSales();

      return { id: ventaId, folio, syncId: ventaSyncId };
    }
  );

  // ── Cotizaciones ────────────────────────────────────────────────────
  ipcMain.handle(
    "cotizaciones:create",
    async (
      _event,
      data: {
        terminalId: number;
        usuarioId: number;
        clienteId?: number;
        subtotal: number;
        descuento: number;
        iva: number;
        total: number;
        items: Array<{
          productoId: number;
          nombre: string;
          cantidad: number;
          precioUnitario: number;
          descuento: number;
          subtotal: number;
        }>;
      }
    ) => {
      const folio = `COT-${Date.now().toString(36).toUpperCase()}`;
      const ventaSyncId = randomUUID();
      const fecha = new Date().toISOString();

      const ventaResult = db
        .insert(schema.ventas)
        .values({
          folio,
          terminalId: data.terminalId,
          usuarioId: data.usuarioId,
          clienteId: data.clienteId || null,
          subtotal: data.subtotal,
          descuento: data.descuento,
          iva: data.iva,
          total: data.total,
          tipo: "cotizacion" as any,
          estado: "cotizacion" as any,
          fecha,
          syncId: ventaSyncId,
          syncStatus: "pendiente",
        })
        .run();

      const ventaId = Number(ventaResult.lastInsertRowid);

      for (const item of data.items) {
        db.insert(schema.ventaDetalles)
          .values({
            ventaId,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            subtotal: item.subtotal,
            syncId: randomUUID(),
            syncStatus: "pendiente",
          })
          .run();
      }

      return { id: ventaId, folio };
    }
  );

  ipcMain.handle("cotizaciones:list", async () => {
    return sqlite
      .prepare(
        `SELECT v.*, c.nombre as clienteNombre
         FROM ventas v
         LEFT JOIN clientes c ON c.id = v.cliente_id
         WHERE v.tipo = 'cotizacion'
         ORDER BY v.fecha DESC
         LIMIT 50`
      )
      .all();
  });

  ipcMain.handle("cotizaciones:convert", async (_event, cotizacionId: number) => {
    // Change cotizacion to normal sale
    sqlite
      .prepare(`UPDATE ventas SET tipo = 'normal', estado = 'completada', sync_status = 'pendiente' WHERE id = ?`)
      .run(cotizacionId);

    const venta = sqlite.prepare(`SELECT * FROM ventas WHERE id = ?`).get(cotizacionId) as any;
    return venta;
  });

  ipcMain.handle("cotizaciones:delete", async (_event, id: number) => {
    sqlite.prepare(`DELETE FROM venta_detalles WHERE venta_id = ?`).run(id);
    sqlite.prepare(`DELETE FROM ventas WHERE id = ?`).run(id);
    return { success: true };
  });

  // ── Clients ──────────────────────────────────────────────────────────
  ipcMain.handle("clients:list", async (_event, query?: string) => {
    if (query && query.trim()) {
      return db
        .select()
        .from(schema.clientes)
        .where(
          or(
            like(schema.clientes.nombre, `%${query}%`),
            like(schema.clientes.rfc, `%${query}%`),
            like(schema.clientes.telefono, `%${query}%`)
          )
        )
        .limit(100)
        .all();
    }
    return db
      .select()
      .from(schema.clientes)
      .where(eq(schema.clientes.activo, true))
      .limit(100)
      .all();
  });

  ipcMain.handle("clients:get", async (_event, id: number) => {
    return db
      .select()
      .from(schema.clientes)
      .where(eq(schema.clientes.id, id))
      .limit(1)
      .all()
      .then((rows) => rows[0] || null);
  });

  ipcMain.handle(
    "clients:create",
    async (
      _event,
      data: {
        nombre: string;
        telefono?: string;
        email?: string;
        rfc?: string;
        razonSocial?: string;
        regimenFiscal?: string;
        usoCfdi?: string;
        domicilioFiscal?: string;
        limiteCredito?: number;
      }
    ) => {
      const result = db
        .insert(schema.clientes)
        .values({
          nombre: data.nombre,
          telefono: data.telefono || null,
          email: data.email || null,
          rfc: data.rfc || null,
          razonSocial: data.razonSocial || null,
          regimenFiscal: data.regimenFiscal || null,
          usoCfdi: data.usoCfdi || null,
          domicilioFiscal: data.domicilioFiscal || null,
          limiteCredito: data.limiteCredito ?? 0,
          syncId: randomUUID(),
          syncStatus: "pendiente",
        })
        .run();
      return { id: Number(result.lastInsertRowid) };
    }
  );

  ipcMain.handle(
    "clients:update",
    async (
      _event,
      id: number,
      data: {
        nombre?: string;
        telefono?: string;
        email?: string;
        rfc?: string;
        razonSocial?: string;
        regimenFiscal?: string;
        usoCfdi?: string;
        domicilioFiscal?: string;
        limiteCredito?: number;
        activo?: boolean;
      }
    ) => {
      const values: Record<string, any> = {};
      if (data.nombre !== undefined) values.nombre = data.nombre;
      if (data.telefono !== undefined) values.telefono = data.telefono;
      if (data.email !== undefined) values.email = data.email;
      if (data.rfc !== undefined) values.rfc = data.rfc;
      if (data.razonSocial !== undefined) values.razonSocial = data.razonSocial;
      if (data.regimenFiscal !== undefined) values.regimenFiscal = data.regimenFiscal;
      if (data.usoCfdi !== undefined) values.usoCfdi = data.usoCfdi;
      if (data.domicilioFiscal !== undefined) values.domicilioFiscal = data.domicilioFiscal;
      if (data.limiteCredito !== undefined) values.limiteCredito = data.limiteCredito;
      if (data.activo !== undefined) values.activo = data.activo;
      values.syncStatus = "pendiente";

      db.update(schema.clientes)
        .set(values)
        .where(eq(schema.clientes.id, id))
        .run();

      return { success: true };
    }
  );

  ipcMain.handle("clients:purchases", async (_event, clienteId: number) => {
    return db
      .select()
      .from(schema.ventas)
      .where(eq(schema.ventas.clienteId, clienteId))
      .limit(50)
      .all();
  });

  // ── Inventory ─────────────────────────────────────────────────────────
  ipcMain.handle("inventory:products", async (_event, query?: string) => {
    if (query && query.trim()) {
      return db
        .select()
        .from(schema.productos)
        .where(
          or(
            like(schema.productos.nombre, `%${query}%`),
            like(schema.productos.sku, `%${query}%`)
          )
        )
        .limit(100)
        .all();
    }
    return db.select().from(schema.productos).limit(100).all();
  });

  ipcMain.handle("inventory:stock-alerts", async () => {
    return db
      .select()
      .from(schema.productos)
      .where(eq(schema.productos.activo, true))
      .all()
      .then((products) =>
        products.filter((p) => p.stockMinimo > 0)
      );
  });

  // ── Cash Cuts ────────────────────────────────────────────────────────
  ipcMain.handle(
    "cortes:abrir",
    async (_event, data: { terminalId: number; efectivoInicial: number }) => {
      // Check for open cut
      const open = db
        .select()
        .from(schema.cortesCaja)
        .where(eq(schema.cortesCaja.terminalId, data.terminalId))
        .all()
        .filter((c) => !c.fechaCierre);

      if (open.length > 0) {
        return { error: "Ya existe un corte abierto" };
      }

      const result = db
        .insert(schema.cortesCaja)
        .values({
          terminalId: data.terminalId,
          usuarioId: 0,
          tipo: "parcial",
          efectivoInicial: data.efectivoInicial,
          fechaApertura: new Date().toISOString(),
          syncId: randomUUID(),
          syncStatus: "pendiente",
        })
        .run();

      return { id: Number(result.lastInsertRowid) };
    }
  );

  ipcMain.handle("cortes:activo", async (_event, terminalId: number) => {
    const cortes = db
      .select()
      .from(schema.cortesCaja)
      .where(eq(schema.cortesCaja.terminalId, terminalId))
      .all()
      .filter((c) => !c.fechaCierre);

    if (cortes.length === 0) return null;

    const corte = cortes[0];
    const movimientos = db
      .select()
      .from(schema.movimientosCaja)
      .where(eq(schema.movimientosCaja.corteId, corte.id))
      .all();

    return { ...corte, movimientos };
  });

  ipcMain.handle(
    "cortes:cerrar",
    async (
      _event,
      id: number,
      data: {
        tipo: string;
        efectivoDeclarado: number;
        efectivoSistema: number;
        totalVentas: number;
        totalEfectivo: number;
        totalTarjeta: number;
        totalTransferencia: number;
        totalOtros: number;
      }
    ) => {
      const diferencia = data.efectivoDeclarado - data.efectivoSistema;

      db.update(schema.cortesCaja)
        .set({
          tipo: data.tipo as any,
          efectivoSistema: data.efectivoSistema,
          efectivoDeclarado: data.efectivoDeclarado,
          diferencia,
          totalVentas: data.totalVentas,
          totalEfectivo: data.totalEfectivo,
          totalTarjeta: data.totalTarjeta,
          totalTransferencia: data.totalTransferencia,
          totalOtros: data.totalOtros,
          fechaCierre: new Date().toISOString(),
          syncStatus: "pendiente",
        })
        .where(eq(schema.cortesCaja.id, id))
        .run();

      return { success: true };
    }
  );

  ipcMain.handle(
    "cortes:movimiento",
    async (
      _event,
      corteId: number,
      data: { tipo: string; monto: number; concepto: string }
    ) => {
      const result = db
        .insert(schema.movimientosCaja)
        .values({
          corteId,
          tipo: data.tipo as any,
          monto: data.monto,
          concepto: data.concepto,
          fecha: new Date().toISOString(),
          syncId: randomUUID(),
          syncStatus: "pendiente",
        })
        .run();

      return { id: Number(result.lastInsertRowid) };
    }
  );

  ipcMain.handle("cortes:list", async (_event, terminalId: number) => {
    return db
      .select()
      .from(schema.cortesCaja)
      .where(eq(schema.cortesCaja.terminalId, terminalId))
      .all()
      .sort((a, b) => (b.fechaApertura > a.fechaApertura ? 1 : -1));
  });

  // ── Promociones ──────────────────────────────────────────────────────
  ipcMain.handle("promos:list", async () => {
    return db.select().from(schema.promociones).all();
  });

  ipcMain.handle("promos:active", async () => {
    const now = new Date().toISOString();
    return db
      .select()
      .from(schema.promociones)
      .where(eq(schema.promociones.activa, true))
      .all()
      .filter((p) => p.fechaInicio <= now && p.fechaFin >= now);
  });

  ipcMain.handle(
    "promos:create",
    async (
      _event,
      data: {
        nombre: string;
        tipo: string;
        valor: number;
        precioObjetivo?: number;
        productoId?: number;
        categoriaId?: number;
        fechaInicio: string;
        fechaFin: string;
      }
    ) => {
      const result = db
        .insert(schema.promociones)
        .values({
          nombre: data.nombre,
          tipo: data.tipo as any,
          valor: data.valor,
          precioObjetivo: data.precioObjetivo || null,
          productoId: data.productoId || null,
          categoriaId: data.categoriaId || null,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          syncId: randomUUID(),
          syncStatus: "pendiente",
        })
        .run();
      return { id: Number(result.lastInsertRowid) };
    }
  );

  ipcMain.handle("promos:toggle", async (_event, id: number, activa: boolean) => {
    db.update(schema.promociones)
      .set({ activa, syncStatus: "pendiente" })
      .where(eq(schema.promociones.id, id))
      .run();
    return { success: true };
  });

  // ── Bitacora ────────────────────────────────────────────────────────
  ipcMain.handle(
    "bitacora:log",
    async (
      _event,
      data: {
        usuarioId: number;
        accion: string;
        entidad: string;
        entidadId?: number;
        descripcion?: string;
      }
    ) => {
      const result = db
        .insert(schema.bitacora)
        .values({
          usuarioId: data.usuarioId,
          accion: data.accion,
          entidad: data.entidad,
          entidadId: data.entidadId || null,
          descripcion: data.descripcion || null,
          fecha: new Date().toISOString(),
          syncId: randomUUID(),
          syncStatus: "pendiente",
        })
        .run();
      return { id: Number(result.lastInsertRowid) };
    }
  );

  ipcMain.handle(
    "bitacora:list",
    async (_event, filters?: { accion?: string; entidad?: string; limit?: number }) => {
      let query = db.select().from(schema.bitacora);

      const results = query.all();

      let filtered = results;
      if (filters?.accion) {
        filtered = filtered.filter((r) => r.accion === filters.accion);
      }
      if (filters?.entidad) {
        filtered = filtered.filter((r) => r.entidad === filters.entidad);
      }

      filtered.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

      return filtered.slice(0, filters?.limit || 100);
    }
  );

  // ── Invoices ─────────────────────────────────────────────────────────
  ipcMain.handle(
    "facturas:create",
    async (
      _event,
      data: {
        ventaIds: number[];
        clienteId: number;
        tipo: string;
        total: number;
      }
    ) => {
      const uuidFiscal = randomUUID().toUpperCase();
      const folioSat = `F-${Date.now().toString(36).toUpperCase()}`;

      const result = db
        .insert(schema.facturas)
        .values({
          ventaIds: JSON.stringify(data.ventaIds),
          clienteId: data.clienteId,
          uuidFiscal,
          tipo: data.tipo as any,
          estado: "timbrada",
          serieSat: "A",
          folioSat,
          fecha: new Date().toISOString(),
          syncId: randomUUID(),
          syncStatus: "pendiente",
        })
        .run();

      return {
        id: Number(result.lastInsertRowid),
        uuidFiscal,
        folioSat,
      };
    }
  );

  ipcMain.handle("facturas:list", async () => {
    const facturas = db
      .select()
      .from(schema.facturas)
      .all()
      .sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

    // Enrich with client name
    return facturas.map((f) => {
      let clienteNombre = null;
      if (f.clienteId) {
        const cliente = db
          .select()
          .from(schema.clientes)
          .where(eq(schema.clientes.id, f.clienteId))
          .limit(1)
          .all()[0];
        clienteNombre = cliente?.nombre || null;
      }
      return { ...f, clienteNombre };
    });
  });

  ipcMain.handle("facturas:cancel", async (_event, id: number) => {
    db.update(schema.facturas)
      .set({ estado: "cancelada" as any, syncStatus: "pendiente" })
      .where(eq(schema.facturas.id, id))
      .run();
    return { success: true };
  });

  ipcMain.handle("facturas:recent-sales", async () => {
    return db
      .select()
      .from(schema.ventas)
      .where(eq(schema.ventas.estado, "completada" as any))
      .limit(50)
      .all()
      .sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  });

  // ── Reports ─────────────────────────────────────────────────────────
  ipcMain.handle(
    "reports:sales-summary",
    async (_event, dateFrom: string, dateTo: string) => {
      const summary = sqlite
        .prepare(
          `SELECT
            COUNT(*) as totalVentas,
            COALESCE(SUM(total), 0) as totalMonto,
            COALESCE(SUM(descuento), 0) as totalDescuento,
            COALESCE(AVG(total), 0) as ticketPromedio
          FROM ventas
          WHERE estado = 'completada'
            AND fecha >= ? AND fecha <= ?`
        )
        .get(dateFrom, dateTo) as any;

      const byDay = sqlite
        .prepare(
          `SELECT
            date(fecha) as dia,
            COUNT(*) as ventas,
            COALESCE(SUM(total), 0) as total
          FROM ventas
          WHERE estado = 'completada'
            AND fecha >= ? AND fecha <= ?
          GROUP BY date(fecha)
          ORDER BY dia`
        )
        .all(dateFrom, dateTo);

      return { summary, byDay };
    }
  );

  ipcMain.handle(
    "reports:top-products",
    async (_event, dateFrom: string, dateTo: string, limit = 20) => {
      return sqlite
        .prepare(
          `SELECT
            vd.producto_id as productoId,
            p.nombre,
            p.sku,
            SUM(vd.cantidad) as cantidadTotal,
            SUM(vd.subtotal) as montoTotal
          FROM venta_detalles vd
          JOIN ventas v ON v.id = vd.venta_id
          JOIN productos p ON p.id = vd.producto_id
          WHERE v.estado = 'completada'
            AND v.fecha >= ? AND v.fecha <= ?
          GROUP BY vd.producto_id
          ORDER BY cantidadTotal DESC
          LIMIT ?`
        )
        .all(dateFrom, dateTo, limit);
    }
  );

  ipcMain.handle(
    "reports:by-payment-method",
    async (_event, dateFrom: string, dateTo: string) => {
      return sqlite
        .prepare(
          `SELECT
            p.forma_pago as formaPago,
            COUNT(*) as cantidad,
            COALESCE(SUM(p.monto), 0) as total
          FROM pagos p
          JOIN ventas v ON v.id = p.venta_id
          WHERE v.estado = 'completada'
            AND v.fecha >= ? AND v.fecha <= ?
          GROUP BY p.forma_pago
          ORDER BY total DESC`
        )
        .all(dateFrom, dateTo);
    }
  );

  // ── Config ──────────────────────────────────────────────────────────
  ipcMain.handle("config:app-info", async () => {
    return {
      version: app.getVersion(),
      dbPath,
      userDataPath: app.getPath("userData"),
      platform: process.platform,
      arch: process.arch,
    };
  });

  ipcMain.handle("config:db-stats", async () => {
    const productos = sqlite
      .prepare("SELECT COUNT(*) as count FROM productos")
      .get() as any;
    const ventas = sqlite
      .prepare("SELECT COUNT(*) as count FROM ventas")
      .get() as any;
    const clientes = sqlite
      .prepare("SELECT COUNT(*) as count FROM clientes")
      .get() as any;
    const categorias = sqlite
      .prepare("SELECT COUNT(*) as count FROM categorias")
      .get() as any;

    return {
      productos: productos.count,
      ventas: ventas.count,
      clientes: clientes.count,
      categorias: categorias.count,
    };
  });

  // ── Sync ──────────────────────────────────────────────────────────────
  ipcMain.handle("sync:status", async () => {
    return { connected: syncService?.isConnected() ?? false };
  });

  ipcMain.handle("sync:flush", async () => {
    await syncService?.flushPendingSales();
    return { success: true };
  });

  ipcMain.handle("sync:pending-count", async () => {
    const rows = db
      .select({ id: schema.ventas.id })
      .from(schema.ventas)
      .where(eq(schema.ventas.syncStatus, "pendiente"))
      .all();
    return rows.length;
  });

  // ── Ticket Printing ─────────────────────────────────────────────────
  ipcMain.handle(
    "ticket:print",
    async (
      _event,
      data: {
        folio: string;
        fecha: string;
        sucursal: string;
        terminal: string;
        cajero: string;
        items: Array<{
          nombre: string;
          cantidad: number;
          precioUnitario: number;
          descuento: number;
          subtotal: number;
        }>;
        subtotal: number;
        descuento: number;
        iva: number;
        total: number;
        pagos: Array<{ formaPago: string; monto: number }>;
        cambio?: number;
        clienteNombre?: string;
      }
    ) => {
      return printTicket(data);
    }
  );

  ipcMain.handle("ticket:preview", async (_event, data: any) => {
    return formatTicketText(data);
  });

  ipcMain.handle(
    "ticket:config",
    async (
      _event,
      config: { type: "epson" | "star"; interface: string; width: number } | null
    ) => {
      setPrinterConfig(config);
      return { success: true };
    }
  );

  ipcMain.handle("ticket:get-config", async () => {
    return getPrinterConfig();
  });

  // ── Ventas en Espera (Hold/Recall) ──────────────────────────────────
  ipcMain.handle(
    "ventas-espera:hold",
    async (
      _event,
      data: {
        nombre: string;
        terminalId: number;
        usuarioId: number;
        clienteId?: number;
        items: Array<{
          productoId: number;
          nombre: string;
          cantidad: number;
          precioUnitario: number;
          descuento: number;
          subtotal: number;
          tasaIva: number;
        }>;
      }
    ) => {
      const stmt = sqlite.prepare(
        `INSERT INTO ventas_espera (nombre, terminal_id, usuario_id, cliente_id, items_json, fecha)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const result = stmt.run(
        data.nombre || "Venta en espera",
        data.terminalId,
        data.usuarioId,
        data.clienteId || null,
        JSON.stringify(data.items),
        new Date().toISOString()
      );
      return { id: Number(result.lastInsertRowid) };
    }
  );

  ipcMain.handle("ventas-espera:list", async (_event, terminalId: number) => {
    const rows = sqlite
      .prepare(
        `SELECT * FROM ventas_espera WHERE terminal_id = ? ORDER BY fecha DESC`
      )
      .all(terminalId) as any[];

    return rows.map((r) => ({
      ...r,
      items: JSON.parse(r.items_json),
    }));
  });

  ipcMain.handle("ventas-espera:recall", async (_event, id: number) => {
    const row = sqlite
      .prepare(`SELECT * FROM ventas_espera WHERE id = ?`)
      .get(id) as any;

    if (!row) return null;

    sqlite.prepare(`DELETE FROM ventas_espera WHERE id = ?`).run(id);

    return {
      ...row,
      items: JSON.parse(row.items_json),
    };
  });

  ipcMain.handle("ventas-espera:delete", async (_event, id: number) => {
    sqlite.prepare(`DELETE FROM ventas_espera WHERE id = ?`).run(id);
    return { success: true };
  });

  // ── Reimpresion de Tickets ──────────────────────────────────────────
  ipcMain.handle("ventas:get-detail", async (_event, ventaId: number) => {
    const venta = sqlite
      .prepare(`SELECT * FROM ventas WHERE id = ?`)
      .get(ventaId) as any;

    if (!venta) return null;

    const items = sqlite
      .prepare(
        `SELECT vd.*, p.nombre FROM venta_detalles vd
         JOIN productos p ON p.id = vd.producto_id
         WHERE vd.venta_id = ?`
      )
      .all(ventaId) as any[];

    const pagos = sqlite
      .prepare(`SELECT * FROM pagos WHERE venta_id = ?`)
      .all(ventaId) as any[];

    return { ...venta, items, pagos };
  });

  ipcMain.handle("ventas:search-by-folio", async (_event, folio: string) => {
    return sqlite
      .prepare(`SELECT * FROM ventas WHERE folio LIKE ? ORDER BY fecha DESC LIMIT 20`)
      .all(`%${folio}%`);
  });

  ipcMain.handle("ventas:recent", async (_event, limit = 10) => {
    return sqlite
      .prepare(
        `SELECT * FROM ventas WHERE estado = 'completada' ORDER BY fecha DESC LIMIT ?`
      )
      .all(limit);
  });

  // ── Devoluciones ────────────────────────────────────────────────────
  ipcMain.handle(
    "devoluciones:create",
    async (
      _event,
      data: {
        ventaId: number;
        usuarioId: number;
        motivo: string;
        items: Array<{
          productoId: number;
          nombre: string;
          cantidad: number;
          precioUnitario: number;
          subtotal: number;
        }>;
        total: number;
      }
    ) => {
      const folio = `DEV-${Date.now().toString(36).toUpperCase()}`;
      const syncId = randomUUID();

      const stmt = sqlite.prepare(
        `INSERT INTO devoluciones (venta_id, folio, usuario_id, motivo, total, items_json, fecha, sync_id, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`
      );

      const result = stmt.run(
        data.ventaId,
        folio,
        data.usuarioId,
        data.motivo,
        data.total,
        JSON.stringify(data.items),
        new Date().toISOString(),
        syncId
      );

      // Mark original sale as cancelled if full return
      const originalVenta = sqlite
        .prepare(`SELECT total FROM ventas WHERE id = ?`)
        .get(data.ventaId) as any;

      if (originalVenta && Math.abs(originalVenta.total - data.total) < 0.01) {
        sqlite
          .prepare(
            `UPDATE ventas SET estado = 'cancelada', sync_status = 'pendiente' WHERE id = ?`
          )
          .run(data.ventaId);
      }

      return { id: Number(result.lastInsertRowid), folio };
    }
  );

  ipcMain.handle("devoluciones:list", async () => {
    return sqlite
      .prepare(
        `SELECT d.*, v.folio as ventaFolio
         FROM devoluciones d
         JOIN ventas v ON v.id = d.venta_id
         ORDER BY d.fecha DESC
         LIMIT 100`
      )
      .all();
  });

  // ── Apartados ───────────────────────────────────────────────────────
  ipcMain.handle(
    "apartados:create",
    async (
      _event,
      data: {
        ventaId: number;
        clienteId?: number;
        enganche: number;
        total: number;
        fechaLimite?: string;
      }
    ) => {
      const syncId = randomUUID();
      const saldoPendiente = data.total - data.enganche;

      const result = sqlite
        .prepare(
          `INSERT INTO apartados (venta_id, cliente_id, enganche, saldo_pendiente, total, estado, fecha_limite, fecha, sync_id, sync_status)
           VALUES (?, ?, ?, ?, ?, 'activo', ?, ?, ?, 'pendiente')`
        )
        .run(
          data.ventaId,
          data.clienteId || null,
          data.enganche,
          saldoPendiente,
          data.total,
          data.fechaLimite || null,
          new Date().toISOString(),
          syncId
        );

      const apartadoId = Number(result.lastInsertRowid);

      // Register enganche as first abono
      sqlite
        .prepare(
          `INSERT INTO apartado_abonos (apartado_id, monto, forma_pago, fecha, sync_id, sync_status)
           VALUES (?, ?, 'efectivo', ?, ?, 'pendiente')`
        )
        .run(apartadoId, data.enganche, new Date().toISOString(), randomUUID());

      // Mark sale as apartado
      sqlite
        .prepare(`UPDATE ventas SET tipo = 'apartado', estado = 'en_espera', sync_status = 'pendiente' WHERE id = ?`)
        .run(data.ventaId);

      return { id: apartadoId, saldoPendiente };
    }
  );

  ipcMain.handle("apartados:list", async () => {
    return sqlite
      .prepare(
        `SELECT a.*, c.nombre as clienteNombre, v.folio as ventaFolio
         FROM apartados a
         LEFT JOIN clientes c ON c.id = a.cliente_id
         JOIN ventas v ON v.id = a.venta_id
         ORDER BY a.fecha DESC`
      )
      .all();
  });

  ipcMain.handle("apartados:get", async (_event, id: number) => {
    const apartado = sqlite
      .prepare(
        `SELECT a.*, c.nombre as clienteNombre, v.folio as ventaFolio
         FROM apartados a
         LEFT JOIN clientes c ON c.id = a.cliente_id
         JOIN ventas v ON v.id = a.venta_id
         WHERE a.id = ?`
      )
      .get(id) as any;

    if (!apartado) return null;

    const abonos = sqlite
      .prepare(`SELECT * FROM apartado_abonos WHERE apartado_id = ? ORDER BY fecha DESC`)
      .all(id);

    return { ...apartado, abonos };
  });

  ipcMain.handle(
    "apartados:abono",
    async (_event, id: number, data: { monto: number; formaPago: string }) => {
      const apartado = sqlite
        .prepare(`SELECT * FROM apartados WHERE id = ?`)
        .get(id) as any;

      if (!apartado || apartado.estado !== "activo") {
        return { error: "Apartado no activo" };
      }

      sqlite
        .prepare(
          `INSERT INTO apartado_abonos (apartado_id, monto, forma_pago, fecha, sync_id, sync_status)
           VALUES (?, ?, ?, ?, ?, 'pendiente')`
        )
        .run(id, data.monto, data.formaPago, new Date().toISOString(), randomUUID());

      const nuevoSaldo = apartado.saldo_pendiente - data.monto;
      const liquidado = nuevoSaldo <= 0;

      sqlite
        .prepare(`UPDATE apartados SET saldo_pendiente = ?, estado = ?, sync_status = 'pendiente' WHERE id = ?`)
        .run(Math.max(0, nuevoSaldo), liquidado ? "liquidado" : "activo", id);

      if (liquidado) {
        sqlite
          .prepare(`UPDATE ventas SET estado = 'completada', sync_status = 'pendiente' WHERE id = ?`)
          .run(apartado.venta_id);
      }

      return { saldoPendiente: Math.max(0, nuevoSaldo), liquidado };
    }
  );

  ipcMain.handle("apartados:cancelar", async (_event, id: number) => {
    const apartado = sqlite
      .prepare(`SELECT * FROM apartados WHERE id = ?`)
      .get(id) as any;

    if (!apartado || apartado.estado !== "activo") {
      return { error: "Apartado no activo" };
    }

    sqlite
      .prepare(`UPDATE apartados SET estado = 'cancelado', sync_status = 'pendiente' WHERE id = ?`)
      .run(id);

    sqlite
      .prepare(`UPDATE ventas SET estado = 'cancelada', sync_status = 'pendiente' WHERE id = ?`)
      .run(apartado.venta_id);

    return { success: true };
  });

  // ── Tarjetas de Regalo ──────────────────────────────────────────────
  ipcMain.handle(
    "tarjetas:create",
    async (_event, data: { codigo: string; saldo: number; clienteId?: number }) => {
      const syncId = randomUUID();

      const result = sqlite
        .prepare(
          `INSERT INTO tarjetas_regalo (codigo, saldo, cliente_id, activa, sync_id, sync_status)
           VALUES (?, ?, ?, 1, ?, 'pendiente')`
        )
        .run(data.codigo, data.saldo, data.clienteId || null, syncId);

      const tarjetaId = Number(result.lastInsertRowid);

      sqlite
        .prepare(
          `INSERT INTO tarjeta_regalo_movimientos (tarjeta_id, tipo, monto, fecha, sync_id, sync_status)
           VALUES (?, 'carga', ?, ?, ?, 'pendiente')`
        )
        .run(tarjetaId, data.saldo, new Date().toISOString(), randomUUID());

      return { id: tarjetaId, codigo: data.codigo };
    }
  );

  ipcMain.handle("tarjetas:list", async () => {
    return sqlite
      .prepare(`SELECT t.*, c.nombre as clienteNombre FROM tarjetas_regalo t LEFT JOIN clientes c ON c.id = t.cliente_id ORDER BY t.created_at DESC`)
      .all();
  });

  ipcMain.handle("tarjetas:balance", async (_event, codigo: string) => {
    const tarjeta = sqlite
      .prepare(`SELECT * FROM tarjetas_regalo WHERE codigo = ?`)
      .get(codigo) as any;

    if (!tarjeta) return { error: "Tarjeta no encontrada" };
    if (!tarjeta.activa) return { error: "Tarjeta inactiva" };

    return { id: tarjeta.id, codigo: tarjeta.codigo, saldo: tarjeta.saldo };
  });

  ipcMain.handle(
    "tarjetas:cargar",
    async (_event, id: number, monto: number) => {
      const tarjeta = sqlite
        .prepare(`SELECT * FROM tarjetas_regalo WHERE id = ?`)
        .get(id) as any;

      if (!tarjeta) return { error: "Tarjeta no encontrada" };

      const nuevoSaldo = tarjeta.saldo + monto;
      sqlite
        .prepare(`UPDATE tarjetas_regalo SET saldo = ?, sync_status = 'pendiente' WHERE id = ?`)
        .run(nuevoSaldo, id);

      sqlite
        .prepare(
          `INSERT INTO tarjeta_regalo_movimientos (tarjeta_id, tipo, monto, fecha, sync_id, sync_status)
           VALUES (?, 'carga', ?, ?, ?, 'pendiente')`
        )
        .run(id, monto, new Date().toISOString(), randomUUID());

      return { saldo: nuevoSaldo };
    }
  );

  ipcMain.handle(
    "tarjetas:consumir",
    async (_event, id: number, monto: number, ventaId?: number) => {
      const tarjeta = sqlite
        .prepare(`SELECT * FROM tarjetas_regalo WHERE id = ?`)
        .get(id) as any;

      if (!tarjeta) return { error: "Tarjeta no encontrada" };
      if (tarjeta.saldo < monto) return { error: "Saldo insuficiente" };

      const nuevoSaldo = tarjeta.saldo - monto;
      sqlite
        .prepare(`UPDATE tarjetas_regalo SET saldo = ?, sync_status = 'pendiente' WHERE id = ?`)
        .run(nuevoSaldo, id);

      sqlite
        .prepare(
          `INSERT INTO tarjeta_regalo_movimientos (tarjeta_id, tipo, monto, venta_id, fecha, sync_id, sync_status)
           VALUES (?, 'consumo', ?, ?, ?, ?, 'pendiente')`
        )
        .run(id, monto, ventaId || null, new Date().toISOString(), randomUUID());

      return { saldo: nuevoSaldo };
    }
  );

  ipcMain.handle("tarjetas:movimientos", async (_event, id: number) => {
    return sqlite
      .prepare(`SELECT * FROM tarjeta_regalo_movimientos WHERE tarjeta_id = ? ORDER BY fecha DESC`)
      .all(id);
  });
}
