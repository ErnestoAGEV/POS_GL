import { io, Socket } from "socket.io-client";
import { BrowserWindow } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@posgl/shared/schemas";

interface SyncServiceConfig {
  serverUrl: string;
  token: string;
  terminalId: number;
  sucursalId: number;
  db: ReturnType<typeof drizzle>;
  sqlite: Database.Database;
  mainWindow: BrowserWindow | null;
}

export class SyncService {
  private socket: Socket | null = null;
  private config: SyncServiceConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: SyncServiceConfig) {
    this.config = config;
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(this.config.serverUrl, {
      path: "/ws",
      auth: { token: this.config.token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on("connect", () => {
      this.emitToRenderer("sync:status", "online");
      this.socket!.emit("terminal:identify", {
        terminalId: this.config.terminalId,
        sucursalId: this.config.sucursalId,
      });
      this.flushPendingSales();
    });

    this.socket.on("disconnect", () => {
      this.emitToRenderer("sync:status", "offline");
    });

    this.socket.on("connect_error", () => {
      this.emitToRenderer("sync:status", "offline");
    });

    this.socket.on("product:updated", (product: any) => {
      this.upsertLocalProduct(product);
      this.emitToRenderer("sync:product-updated", product);
    });

    this.socket.on("product:created", (product: any) => {
      this.upsertLocalProduct(product);
      this.emitToRenderer("sync:product-created", product);
    });

    this.socket.on("product:deleted", (data: { id: number }) => {
      this.config.db
        .update(schema.productos)
        .set({ activo: false })
        .where(eq(schema.productos.id, data.id))
        .run();
      this.emitToRenderer("sync:product-deleted", data);
    });

    this.syncTimer = setInterval(() => {
      this.flushPendingSales();
    }, 30000);
  }

  disconnect() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private emitToRenderer(channel: string, data: any) {
    this.config.mainWindow?.webContents.send(channel, data);
  }

  private upsertLocalProduct(product: any) {
    const existing = this.config.db
      .select({ id: schema.productos.id })
      .from(schema.productos)
      .where(eq(schema.productos.id, product.id))
      .all();

    if (existing.length > 0) {
      this.config.db
        .update(schema.productos)
        .set({
          nombre: product.nombre,
          sku: product.sku,
          codigoBarras: product.codigoBarras,
          precioVenta: product.precioVenta,
          costo: product.costo,
          categoriaId: product.categoriaId,
          stockMinimo: product.stockMinimo,
          claveSat: product.claveSat,
          unidadSat: product.unidadSat,
          tasaIva: product.tasaIva,
          activo: product.activo,
          syncStatus: "sincronizado",
        })
        .where(eq(schema.productos.id, product.id))
        .run();
    } else {
      this.config.db
        .insert(schema.productos)
        .values({
          id: product.id,
          nombre: product.nombre,
          sku: product.sku,
          codigoBarras: product.codigoBarras,
          precioVenta: product.precioVenta,
          costo: product.costo,
          categoriaId: product.categoriaId,
          stockMinimo: product.stockMinimo,
          claveSat: product.claveSat,
          unidadSat: product.unidadSat,
          tasaIva: product.tasaIva,
          activo: product.activo,
          syncId: product.syncId,
          syncStatus: "sincronizado",
        })
        .run();
    }
  }

  async flushPendingSales() {
    if (!this.socket?.connected) return;

    const pending = this.config.db
      .select()
      .from(schema.ventas)
      .where(eq(schema.ventas.syncStatus, "pendiente"))
      .all();

    if (pending.length === 0) return;

    this.emitToRenderer("sync:status", "syncing");

    const batch = [];
    for (const venta of pending) {
      const detalles = this.config.db
        .select()
        .from(schema.ventaDetalles)
        .where(eq(schema.ventaDetalles.ventaId, venta.id))
        .all();

      const pagos = this.config.db
        .select()
        .from(schema.pagos)
        .where(eq(schema.pagos.ventaId, venta.id))
        .all();

      batch.push({ ...venta, detalles, pagos });
    }

    try {
      const response = await fetch(
        `${this.config.serverUrl}/sync/ventas/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.token}`,
          },
          body: JSON.stringify(batch),
        }
      );

      if (response.ok) {
        const { results } = await response.json();
        for (const r of results) {
          if (r.status === "synced" || r.status === "already_synced") {
            this.config.db
              .update(schema.ventas)
              .set({ syncStatus: "sincronizado" })
              .where(eq(schema.ventas.syncId, r.syncId))
              .run();
          }
        }
      }
    } catch {
      // Network error — will retry on next cycle
    }

    this.emitToRenderer(
      "sync:status",
      this.socket?.connected ? "online" : "offline"
    );
  }

  async downloadCatalog() {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${this.config.serverUrl}/sync/products`, {
          headers: { Authorization: `Bearer ${this.config.token}` },
        }),
        fetch(`${this.config.serverUrl}/sync/categories`, {
          headers: { Authorization: `Bearer ${this.config.token}` },
        }),
      ]);

      if (productsRes.ok) {
        const { data: products } = await productsRes.json();
        for (const p of products) {
          this.upsertLocalProduct(p);
        }
      }

      if (categoriesRes.ok) {
        const { data: categories } = await categoriesRes.json();
        for (const c of categories) {
          const existing = this.config.db
            .select({ id: schema.categorias.id })
            .from(schema.categorias)
            .where(eq(schema.categorias.id, c.id))
            .all();

          if (existing.length > 0) {
            this.config.db
              .update(schema.categorias)
              .set({
                nombre: c.nombre,
                categoriaPadreId: c.categoriaPadreId,
                activa: c.activa,
                syncStatus: "sincronizado",
              })
              .where(eq(schema.categorias.id, c.id))
              .run();
          } else {
            this.config.db
              .insert(schema.categorias)
              .values({
                id: c.id,
                nombre: c.nombre,
                categoriaPadreId: c.categoriaPadreId,
                activa: c.activa,
                syncId: c.syncId,
                syncStatus: "sincronizado",
              })
              .run();
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
