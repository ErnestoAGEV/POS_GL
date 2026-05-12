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

  // ── Sync ──────────────────────────────────────────────────────────────
  ipcMain.handle("sync:status", async () => {
    return { connected: syncService?.isConnected() ?? false };
  });

  ipcMain.handle("sync:flush", async () => {
    await syncService?.flushPendingSales();
    return { success: true };
  });
}
