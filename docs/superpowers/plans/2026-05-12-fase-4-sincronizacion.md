# Fase 4: Sincronizacion - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the desktop POS terminals to the central server via REST API for authentication and batch sync, plus Socket.io WebSockets for real-time price/product updates. Implement offline queue so terminals keep working when disconnected.

**Architecture:** Desktop authenticates against server API, downloads product catalog on login, uploads sales in batches. Socket.io pushes real-time price/product changes from server to all connected terminals. Offline queue stores pending operations in SQLite and flushes on reconnect.

**Tech Stack:** Socket.io (server + client), Fastify REST API, SQLite sync queue, Zustand stores

---

## File Structure

```
apps/server/
  src/
    index.ts                          # Modified: add Socket.io
    plugins/
      socketio.ts                     # NEW: Socket.io plugin
    routes/
      sync.routes.ts                  # NEW: batch sync endpoints
      ventas.routes.ts                # NEW: ventas CRUD + receive from terminals

apps/desktop/
  package.json                        # Modified: add socket.io-client
  src/
    main/
      ipc-handlers.ts                 # Modified: add ventas, auth, sync handlers
      sync-service.ts                 # NEW: sync queue + Socket.io client
    preload/
      index.ts                        # Modified: expose new IPC channels
    renderer/
      stores/
        auth-store.ts                 # Modified: real server auth
        sync-store.ts                 # NEW: connection status store
      components/
        layout/
          Navbar.tsx                   # Modified: add connection indicator
          SyncIndicator.tsx            # NEW: online/offline/syncing badge
      pages/
        PosPage.tsx                    # Modified: wire sale completion to DB
```

---

### Task 1: Server - Add Socket.io Plugin

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/src/plugins/socketio.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Add socket.io dependency**

Add to `apps/server/package.json` dependencies:

```json
"socket.io": "^4.8.0",
"@fastify/websocket": "^11.0.0"
```

Run: `cd apps/server && pnpm install`

- [ ] **Step 2: Create Socket.io plugin**

```typescript
// apps/server/src/plugins/socketio.ts

import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

export default fp(async function socketioPlugin(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/ws",
  });

  app.decorate("io", io);

  io.on("connection", (socket) => {
    app.log.info(`Terminal connected: ${socket.id}`);

    socket.on("terminal:identify", (data: { terminalId: number; sucursalId: number }) => {
      socket.join(`sucursal:${data.sucursalId}`);
      socket.join(`terminal:${data.terminalId}`);
      app.log.info(`Terminal ${data.terminalId} joined sucursal ${data.sucursalId}`);
    });

    socket.on("disconnect", (reason) => {
      app.log.info(`Terminal disconnected: ${socket.id} (${reason})`);
    });
  });

  app.addHook("onClose", async () => {
    io.close();
  });
});
```

- [ ] **Step 3: Register Socket.io plugin in server index**

Modify `apps/server/src/index.ts` — add import and register after cors:

```typescript
import socketioPlugin from "./plugins/socketio.js";

// After cors registration:
await app.register(socketioPlugin);
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/package.json apps/server/src/plugins/socketio.ts apps/server/src/index.ts pnpm-lock.yaml
git commit -m "feat(server): add Socket.io plugin for real-time terminal communication"
```

---

### Task 2: Server - Add Ventas Routes

**Files:**
- Create: `apps/server/src/routes/ventas.routes.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/db/schema.ts`

- [ ] **Step 1: Add ventas/ventaDetalles/pagos tables to server PG schema**

Add to the end of `apps/server/src/db/schema.ts`:

```typescript
export const ventas = pgTable("ventas", {
  id: serial("id").primaryKey(),
  folio: text("folio").unique(),
  terminalId: integer("terminal_id")
    .notNull()
    .references(() => terminales.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  clienteId: integer("cliente_id").references(() => clientes.id),
  subtotal: real("subtotal").notNull(),
  descuento: real("descuento").notNull().default(0),
  iva: real("iva").notNull(),
  total: real("total").notNull(),
  tipo: text("tipo", { enum: ["normal", "apartado", "cotizacion"] })
    .notNull()
    .default("normal"),
  estado: text("estado", {
    enum: ["completada", "cancelada", "en_espera", "cotizacion"],
  })
    .notNull()
    .default("completada"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
  ...timestampColumns,
});

export const ventaDetalles = pgTable("venta_detalles", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: real("cantidad").notNull(),
  precioUnitario: real("precio_unitario").notNull(),
  descuento: real("descuento").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  ...syncColumns,
});

export const pagos = pgTable("pagos", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  formaPago: text("forma_pago", {
    enum: [
      "efectivo",
      "tarjeta",
      "transferencia",
      "credito",
      "vale_despensa",
      "tarjeta_regalo",
    ],
  }).notNull(),
  monto: real("monto").notNull(),
  referencia: text("referencia"),
  ...syncColumns,
});
```

- [ ] **Step 2: Create ventas routes**

```typescript
// apps/server/src/routes/ventas.routes.ts

import { FastifyInstance } from "fastify";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function ventasRoutes(app: FastifyInstance) {
  // POST /ventas — receive a sale from a terminal
  app.post<{
    Body: {
      folio: string;
      terminalId: number;
      usuarioId: number;
      clienteId?: number;
      subtotal: number;
      descuento: number;
      iva: number;
      total: number;
      tipo: string;
      estado: string;
      fecha: string;
      syncId: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
        precioUnitario: number;
        descuento: number;
        subtotal: number;
        syncId: string;
      }>;
      pagos: Array<{
        formaPago: string;
        monto: number;
        referencia?: string;
        syncId: string;
      }>;
    };
  }>("/ventas", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const body = request.body;

      // Check if venta already exists (idempotent by syncId)
      const existing = await db
        .select({ id: schema.ventas.id })
        .from(schema.ventas)
        .where(eq(schema.ventas.syncId, body.syncId))
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        return { id: existing.id, status: "already_synced" };
      }

      // Insert venta
      const [venta] = await db
        .insert(schema.ventas)
        .values({
          folio: body.folio,
          terminalId: body.terminalId,
          usuarioId: body.usuarioId,
          clienteId: body.clienteId || null,
          subtotal: body.subtotal,
          descuento: body.descuento,
          iva: body.iva,
          total: body.total,
          tipo: body.tipo as any,
          estado: body.estado as any,
          fecha: new Date(body.fecha),
          syncId: body.syncId,
          syncStatus: "sincronizado",
        })
        .returning({ id: schema.ventas.id });

      // Insert detalles
      if (body.detalles.length > 0) {
        await db.insert(schema.ventaDetalles).values(
          body.detalles.map((d) => ({
            ventaId: venta.id,
            productoId: d.productoId,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            descuento: d.descuento,
            subtotal: d.subtotal,
            syncId: d.syncId,
            syncStatus: "sincronizado" as const,
          }))
        );
      }

      // Insert pagos
      if (body.pagos.length > 0) {
        await db.insert(schema.pagos).values(
          body.pagos.map((p) => ({
            ventaId: venta.id,
            formaPago: p.formaPago as any,
            monto: p.monto,
            referencia: p.referencia || null,
            syncId: p.syncId,
            syncStatus: "sincronizado" as const,
          }))
        );
      }

      // Update stock
      for (const d of body.detalles) {
        await db
          .update(schema.stockSucursal)
          .set({
            cantidad: sql`${schema.stockSucursal.cantidad} - ${d.cantidad}`,
          })
          .where(
            and(
              eq(schema.stockSucursal.productoId, d.productoId),
              eq(
                schema.stockSucursal.sucursalId,
                body.terminalId // TODO: resolve sucursalId from terminal
              )
            )
          );
      }

      return { id: venta.id, status: "synced" };
    },
  });

  // GET /ventas — list ventas with pagination
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      terminalId?: string;
      desde?: string;
      hasta?: string;
    };
  }>("/ventas", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.terminalId) {
        conditions.push(
          eq(schema.ventas.terminalId, parseInt(request.query.terminalId, 10))
        );
      }
      if (request.query.desde) {
        conditions.push(gte(schema.ventas.fecha, new Date(request.query.desde)));
      }
      if (request.query.hasta) {
        conditions.push(lte(schema.ventas.fecha, new Date(request.query.hasta)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.ventas)
        .where(where)
        .orderBy(desc(schema.ventas.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /ventas/:id — get venta with detalles and pagos
  app.get<{ Params: { id: string } }>("/ventas/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const venta = await db
        .select()
        .from(schema.ventas)
        .where(eq(schema.ventas.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!venta) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const detalles = await db
        .select()
        .from(schema.ventaDetalles)
        .where(eq(schema.ventaDetalles.ventaId, id));

      const pagos = await db
        .select()
        .from(schema.pagos)
        .where(eq(schema.pagos.ventaId, id));

      return { ...venta, detalles, pagos };
    },
  });
}
```

- [ ] **Step 3: Register ventas routes in server index**

Add to `apps/server/src/index.ts`:

```typescript
import { ventasRoutes } from "./routes/ventas.routes.js";

// After proveedoresRoutes:
await app.register(ventasRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/db/schema.ts apps/server/src/routes/ventas.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add ventas routes and PG schema for ventas/detalles/pagos"
```

---

### Task 3: Server - Add Sync Endpoints

**Files:**
- Create: `apps/server/src/routes/sync.routes.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Create sync routes**

```typescript
// apps/server/src/routes/sync.routes.ts

import { FastifyInstance } from "fastify";
import { gt, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function syncRoutes(app: FastifyInstance) {
  // GET /sync/products?since=<ISO timestamp>
  // Returns products updated after the given timestamp
  app.get<{
    Querystring: { since?: string };
  }>("/sync/products", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const since = request.query.since;

      if (since) {
        const rows = await db
          .select()
          .from(schema.productos)
          .where(gt(schema.productos.updatedAt, new Date(since)));
        return { data: rows, timestamp: new Date().toISOString() };
      }

      // Full catalog download
      const rows = await db
        .select()
        .from(schema.productos)
        .where(eq(schema.productos.activo, true));
      return { data: rows, timestamp: new Date().toISOString() };
    },
  });

  // GET /sync/categories?since=<ISO timestamp>
  app.get<{
    Querystring: { since?: string };
  }>("/sync/categories", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const since = request.query.since;

      if (since) {
        const rows = await db
          .select()
          .from(schema.categorias)
          .where(gt(schema.categorias.updatedAt, new Date(since)));
        return { data: rows, timestamp: new Date().toISOString() };
      }

      const rows = await db
        .select()
        .from(schema.categorias)
        .where(eq(schema.categorias.activa, true));
      return { data: rows, timestamp: new Date().toISOString() };
    },
  });

  // GET /sync/stock?sucursalId=N&since=<ISO timestamp>
  app.get<{
    Querystring: { sucursalId: string; since?: string };
  }>("/sync/stock", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const sucursalId = parseInt(request.query.sucursalId, 10);
      const since = request.query.since;

      if (since) {
        const rows = await db
          .select()
          .from(schema.stockSucursal)
          .where(
            gt(schema.stockSucursal.updatedAt, new Date(since))
          );
        return {
          data: rows.filter((r) => r.sucursalId === sucursalId),
          timestamp: new Date().toISOString(),
        };
      }

      const rows = await db
        .select()
        .from(schema.stockSucursal)
        .where(eq(schema.stockSucursal.sucursalId, sucursalId));
      return { data: rows, timestamp: new Date().toISOString() };
    },
  });

  // POST /sync/ventas/batch — receive multiple ventas at once
  app.post<{
    Body: Array<{
      folio: string;
      terminalId: number;
      usuarioId: number;
      clienteId?: number;
      subtotal: number;
      descuento: number;
      iva: number;
      total: number;
      tipo: string;
      estado: string;
      fecha: string;
      syncId: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
        precioUnitario: number;
        descuento: number;
        subtotal: number;
        syncId: string;
      }>;
      pagos: Array<{
        formaPago: string;
        monto: number;
        referencia?: string;
        syncId: string;
      }>;
    }>;
  }>("/sync/ventas/batch", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const ventas = request.body;
      const results: Array<{ syncId: string; status: string }> = [];

      for (const v of ventas) {
        // Check if already synced
        const existing = await db
          .select({ id: schema.ventas.id })
          .from(schema.ventas)
          .where(eq(schema.ventas.syncId, v.syncId))
          .limit(1)
          .then((rows) => rows[0]);

        if (existing) {
          results.push({ syncId: v.syncId, status: "already_synced" });
          continue;
        }

        const [venta] = await db
          .insert(schema.ventas)
          .values({
            folio: v.folio,
            terminalId: v.terminalId,
            usuarioId: v.usuarioId,
            clienteId: v.clienteId || null,
            subtotal: v.subtotal,
            descuento: v.descuento,
            iva: v.iva,
            total: v.total,
            tipo: v.tipo as any,
            estado: v.estado as any,
            fecha: new Date(v.fecha),
            syncId: v.syncId,
            syncStatus: "sincronizado",
          })
          .returning({ id: schema.ventas.id });

        if (v.detalles.length > 0) {
          await db.insert(schema.ventaDetalles).values(
            v.detalles.map((d) => ({
              ventaId: venta.id,
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              descuento: d.descuento,
              subtotal: d.subtotal,
              syncId: d.syncId,
              syncStatus: "sincronizado" as const,
            }))
          );
        }

        if (v.pagos.length > 0) {
          await db.insert(schema.pagos).values(
            v.pagos.map((p) => ({
              ventaId: venta.id,
              formaPago: p.formaPago as any,
              monto: p.monto,
              referencia: p.referencia || null,
              syncId: p.syncId,
              syncStatus: "sincronizado" as const,
            }))
          );
        }

        results.push({ syncId: v.syncId, status: "synced" });
      }

      return { results };
    },
  });
}
```

- [ ] **Step 2: Register sync routes in server index**

Add to `apps/server/src/index.ts`:

```typescript
import { syncRoutes } from "./routes/sync.routes.js";

// After ventasRoutes:
await app.register(syncRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/sync.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add sync endpoints - products, categories, stock, ventas batch"
```

---

### Task 4: Server - Emit Real-time Events on Product/Price Changes

**Files:**
- Modify: `apps/server/src/routes/productos.routes.ts`

- [ ] **Step 1: Emit Socket.io events on product create/update/delete**

Read `apps/server/src/routes/productos.routes.ts` first. Then modify it to emit events after successful mutations.

After each successful product creation, add:

```typescript
app.io.emit("product:created", result);
```

After each successful product update, add:

```typescript
app.io.emit("product:updated", result);
```

After each successful product delete/deactivate, add:

```typescript
app.io.emit("product:deleted", { id });
```

These events are emitted to ALL connected terminals so they can update their local catalogs instantly.

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/productos.routes.ts
git commit -m "feat(server): emit real-time Socket.io events on product changes"
```

---

### Task 5: Desktop - Add socket.io-client and Sync Service

**Files:**
- Modify: `apps/desktop/package.json`
- Create: `apps/desktop/src/main/sync-service.ts`

- [ ] **Step 1: Add socket.io-client dependency**

Add to `apps/desktop/package.json` dependencies:

```json
"socket.io-client": "^4.8.0"
```

Run: `pnpm install` from root

- [ ] **Step 2: Create sync service**

```typescript
// apps/desktop/src/main/sync-service.ts

import { io, Socket } from "socket.io-client";
import { BrowserWindow } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, sql } from "drizzle-orm";
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
      // Flush pending sales on connect
      this.flushPendingSales();
    });

    this.socket.on("disconnect", () => {
      this.emitToRenderer("sync:status", "offline");
    });

    this.socket.on("connect_error", () => {
      this.emitToRenderer("sync:status", "offline");
    });

    // Real-time product updates
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

    // Periodic sync every 30 seconds
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
    // Try update first, then insert
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

      batch.push({
        ...venta,
        detalles,
        pagos,
      });
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/package.json apps/desktop/src/main/sync-service.ts pnpm-lock.yaml
git commit -m "feat(desktop): add SyncService with Socket.io client, offline queue, and catalog download"
```

---

### Task 6: Desktop - Expand IPC Handlers for Auth, Sales, and Sync

**Files:**
- Modify: `apps/desktop/src/main/ipc-handlers.ts`
- Modify: `apps/desktop/src/main/index.ts`

- [ ] **Step 1: Expand ipc-handlers with auth, ventas, and sync**

Rewrite `apps/desktop/src/main/ipc-handlers.ts` to add:

1. `auth:login` — call server API, initialize sync service on success
2. `auth:logout` — disconnect sync service
3. `ventas:create` — save sale to local SQLite with syncStatus=pendiente, generate folio and syncId
4. `sync:status` — return current connection status
5. `sync:flush` — manually trigger pending sales flush
6. Keep existing product/category handlers

The file should:
- Import and instantiate `SyncService` on successful auth
- Store the sync service instance at module scope
- Pass BrowserWindow reference for renderer notifications
- Use crypto.randomUUID() for syncId generation

```typescript
// apps/desktop/src/main/ipc-handlers.ts

import { IpcMain, BrowserWindow } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, like, or, sql } from "drizzle-orm";
import * as schema from "@posgl/shared/schemas";
import { join } from "path";
import { app } from "electron";
import { randomUUID } from "crypto";
import { SyncService } from "./sync-service.js";

const dbPath = join(app.getPath("userData"), "posgl.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
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
      credentials: {
        username: string;
        password: string;
        serverUrl: string;
      }
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

        // Initialize sync service
        syncService = new SyncService({
          serverUrl: credentials.serverUrl,
          token,
          terminalId: 1, // TODO: make configurable
          sucursalId: user.sucursalId,
          db,
          sqlite,
          mainWindow,
        });

        syncService.connect();

        // Download product catalog in background
        syncService.downloadCatalog();

        return { success: true, user, token };
      } catch {
        // Server unreachable — allow offline login
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

      // Insert venta
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

      // Insert detalles
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

      // Insert pagos
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

      // Trigger sync
      syncService?.flushPendingSales();

      return { id: ventaId, folio, syncId: ventaSyncId };
    }
  );

  // ── Sync ──────────────────────────────────────────────────────────────
  ipcMain.handle("sync:status", async () => {
    return {
      connected: syncService?.isConnected() ?? false,
    };
  });

  ipcMain.handle("sync:flush", async () => {
    await syncService?.flushPendingSales();
    return { success: true };
  });
}
```

- [ ] **Step 2: Update main/index.ts to pass window reference**

Modify `apps/desktop/src/main/index.ts` to call `setMainWindow(mainWindow)` after creating the window:

```typescript
import { setMainWindow } from "./ipc-handlers.js";

// After mainWindow creation:
setMainWindow(mainWindow);
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/ipc-handlers.ts apps/desktop/src/main/index.ts
git commit -m "feat(desktop): expand IPC handlers with auth, sales, and sync operations"
```

---

### Task 7: Desktop - Update Preload Script with New IPC Channels

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Add new IPC channels to preload**

Rewrite `apps/desktop/src/preload/index.ts`:

```typescript
// apps/desktop/src/preload/index.ts

import { contextBridge, ipcRenderer } from "electron";

const api = {
  auth: {
    login: (credentials: {
      username: string;
      password: string;
      serverUrl: string;
    }) => ipcRenderer.invoke("auth:login", credentials),
    logout: () => ipcRenderer.invoke("auth:logout"),
  },
  products: {
    search: (query: string) => ipcRenderer.invoke("products:search", query),
    getByBarcode: (code: string) =>
      ipcRenderer.invoke("products:barcode", code),
  },
  categories: {
    list: () => ipcRenderer.invoke("categories:list"),
  },
  ventas: {
    create: (sale: {
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
    }) => ipcRenderer.invoke("ventas:create", sale),
  },
  sync: {
    status: () => ipcRenderer.invoke("sync:status"),
    flush: () => ipcRenderer.invoke("sync:flush"),
    onStatus: (callback: (status: string) => void) => {
      const handler = (_event: any, status: string) => callback(status);
      ipcRenderer.on("sync:status", handler);
      return () => ipcRenderer.removeListener("sync:status", handler);
    },
    onProductUpdated: (callback: (product: any) => void) => {
      const handler = (_event: any, product: any) => callback(product);
      ipcRenderer.on("sync:product-updated", handler);
      return () =>
        ipcRenderer.removeListener("sync:product-updated", handler);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronAPI = typeof api;
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/preload/index.ts
git commit -m "feat(desktop): expand preload API with auth, ventas, and sync channels"
```

---

### Task 8: Desktop - Update Auth Store for Server Login

**Files:**
- Modify: `apps/desktop/src/renderer/stores/auth-store.ts`
- Create: `apps/desktop/src/renderer/stores/sync-store.ts`
- Modify: `apps/desktop/src/renderer/env.d.ts`

- [ ] **Step 1: Update env.d.ts to match new preload API**

```typescript
// apps/desktop/src/renderer/env.d.ts

import type { ElectronAPI } from "../preload/index";

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
```

This file remains the same but the types are now updated via the preload export.

- [ ] **Step 2: Update auth store with server login**

Rewrite `apps/desktop/src/renderer/stores/auth-store.ts`:

```typescript
// apps/desktop/src/renderer/stores/auth-store.ts

import { create } from "zustand";

interface User {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  sucursalId: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isOffline: boolean;
  serverUrl: string;
  loginError: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setServerUrl: (url: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isOffline: false,
  serverUrl: "http://localhost:3000",
  loginError: null,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true, loginError: null });

    const result = await window.api.auth.login({
      username,
      password,
      serverUrl: get().serverUrl,
    });

    if (result.success) {
      set({
        user: result.user,
        token: result.token || null,
        isLoggedIn: true,
        isOffline: result.offline ?? false,
        isLoading: false,
        loginError: null,
      });
      return true;
    }

    set({
      isLoading: false,
      loginError: result.error || "Error de autenticacion",
    });
    return false;
  },

  logout: async () => {
    await window.api.auth.logout();
    set({
      user: null,
      token: null,
      isLoggedIn: false,
      isOffline: false,
      loginError: null,
    });
  },

  setServerUrl: (url: string) => set({ serverUrl: url }),
}));
```

- [ ] **Step 3: Create sync store**

```typescript
// apps/desktop/src/renderer/stores/sync-store.ts

import { create } from "zustand";

type SyncStatus = "online" | "offline" | "syncing";

interface SyncState {
  status: SyncStatus;
  setStatus: (status: SyncStatus) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "offline",
  setStatus: (status) => set({ status }),
}));

// Initialize listener for sync status updates from main process
if (typeof window !== "undefined" && window.api?.sync?.onStatus) {
  window.api.sync.onStatus((status) => {
    useSyncStore.getState().setStatus(status as SyncStatus);
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/env.d.ts apps/desktop/src/renderer/stores/auth-store.ts apps/desktop/src/renderer/stores/sync-store.ts
git commit -m "feat(desktop): update auth store for server login and add sync status store"
```

---

### Task 9: Desktop - Update LoginPage for Server Auth

**Files:**
- Modify: `apps/desktop/src/renderer/pages/LoginPage.tsx`

- [ ] **Step 1: Update LoginPage to use server auth**

Rewrite `apps/desktop/src/renderer/pages/LoginPage.tsx`:

```tsx
// apps/desktop/src/renderer/pages/LoginPage.tsx

import { useState } from "react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../stores/auth-store";
import { LogIn, Server } from "lucide-react";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showServer, setShowServer] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loginError = useAuthStore((s) => s.loginError);
  const isLoading = useAuthStore((s) => s.isLoading);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const setServerUrl = useAuthStore((s) => s.setServerUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    await login(username, password);
  };

  return (
    <div className="min-h-screen bg-pos-bg flex items-center justify-center">
      <div className="bg-pos-card rounded-2xl border border-slate-700 shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-pos-green">
            POSGL
          </h1>
          <p className="text-pos-muted text-sm mt-2">Sistema Punto de Venta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Usuario"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
          />
          <Input
            label="Contrasena"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />

          {loginError && (
            <p className="text-pos-red text-sm text-center">{loginError}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <LogIn size={20} />
            {isLoading ? "Conectando..." : "Iniciar Sesion"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setShowServer(!showServer)}
          className="w-full mt-4 flex items-center justify-center gap-1 text-pos-muted text-xs hover:text-pos-text cursor-pointer transition-colors"
        >
          <Server size={12} />
          Configurar servidor
        </button>

        {showServer && (
          <div className="mt-3">
            <Input
              label="URL del Servidor"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
          </div>
        )}

        <p className="text-pos-muted text-xs text-center mt-6">
          v0.1.0 — Fase 4
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/pages/LoginPage.tsx
git commit -m "feat(desktop): update LoginPage for server authentication with offline fallback"
```

---

### Task 10: Desktop - Add Sync Indicator and Wire Sale Completion

**Files:**
- Create: `apps/desktop/src/renderer/components/layout/SyncIndicator.tsx`
- Modify: `apps/desktop/src/renderer/components/layout/Navbar.tsx`
- Modify: `apps/desktop/src/renderer/pages/PosPage.tsx`

- [ ] **Step 1: Create SyncIndicator component**

```tsx
// apps/desktop/src/renderer/components/layout/SyncIndicator.tsx

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useSyncStore } from "../../stores/sync-store";

export function SyncIndicator() {
  const status = useSyncStore((s) => s.status);

  const config = {
    online: {
      icon: <Wifi size={14} />,
      label: "Conectado",
      className: "text-pos-green",
    },
    offline: {
      icon: <WifiOff size={14} />,
      label: "Sin conexion",
      className: "text-pos-red",
    },
    syncing: {
      icon: <RefreshCw size={14} className="animate-spin" />,
      label: "Sincronizando...",
      className: "text-pos-amber",
    },
  };

  const current = config[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${current.className}`}>
      {current.icon}
      <span>{current.label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Add SyncIndicator to Navbar**

Modify `apps/desktop/src/renderer/components/layout/Navbar.tsx` — add import and render before the clock:

```tsx
import { SyncIndicator } from "./SyncIndicator";

// Inside the navbar's right section, before the Clock div:
<SyncIndicator />
```

- [ ] **Step 3: Wire sale completion in PosPage**

Modify `apps/desktop/src/renderer/pages/PosPage.tsx` — update `handlePaymentComplete` to save the sale via IPC:

```tsx
import { useAuthStore } from "../stores/auth-store";
import { useAppStore } from "../stores/app-store";

// Inside PosPage component:
const user = useAuthStore((s) => s.user);
const terminalId = useAppStore((s) => s.terminalId);

const handlePaymentComplete = async (pagos: Array<{ formaPago: string; monto: number; referencia?: string }>) => {
  const cartItems = useCartStore.getState().items;

  await window.api.ventas.create({
    terminalId,
    usuarioId: user?.id ?? 0,
    subtotal: useCartStore.getState().getSubtotal(),
    descuento: useCartStore.getState().getDiscountTotal(),
    iva: useCartStore.getState().getIva(),
    total: useCartStore.getState().getTotal(),
    items: cartItems.map((item) => ({
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuento,
      subtotal: item.subtotal,
    })),
    pagos,
  });

  clear();
  setShowPayment(false);
};
```

Update `PaymentModal` to pass pagos data on complete. Modify its `onComplete` prop to accept payment details:

The `PaymentModal` component's `onComplete` should pass the selected payment method and amount. Update the interface:

```tsx
// In PaymentModal.tsx, change onComplete to pass pagos:
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (pagos: Array<{ formaPago: string; monto: number; referencia?: string }>) => void;
}

// In handleComplete:
const handleComplete = () => {
  onComplete([{ formaPago: selectedMethod, monto: total }]);
  setAmountReceived("");
  setSelectedMethod("efectivo");
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/layout/SyncIndicator.tsx apps/desktop/src/renderer/components/layout/Navbar.tsx apps/desktop/src/renderer/pages/PosPage.tsx apps/desktop/src/renderer/components/pos/PaymentModal.tsx
git commit -m "feat(desktop): add sync indicator, wire sale completion to SQLite + sync"
```

---

### Task 11: Desktop - Create SQLite Tables for Ventas on Startup

**Files:**
- Modify: `apps/desktop/src/main/ipc-handlers.ts`

- [ ] **Step 1: Ensure ventas/ventaDetalles/pagos tables exist in SQLite**

Add table creation SQL after the database initialization in `ipc-handlers.ts`. Since Drizzle ORM with SQLite doesn't auto-create tables, run raw SQL to ensure they exist:

```typescript
// After db initialization, add:
sqlite.exec(`
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
`);
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/ipc-handlers.ts
git commit -m "feat(desktop): auto-create SQLite tables for ventas, productos, categorias on startup"
```

---

### Task 12: Verify Build

- [ ] **Step 1: Verify server TypeScript compiles**

Run: `cd apps/server && npx tsc --noEmit`

- [ ] **Step 2: Verify desktop Vite build compiles**

Run: `cd apps/desktop && pnpm build`

- [ ] **Step 3: Fix any errors and commit**

```bash
git add .
git commit -m "fix: fix build errors for Phase 4 sync implementation"
```

---

## Summary

| Task | Description | Scope |
|------|-------------|-------|
| 1 | Socket.io plugin on server | Server |
| 2 | Ventas routes + PG schema | Server |
| 3 | Sync batch endpoints | Server |
| 4 | Real-time product events | Server |
| 5 | SyncService + socket.io-client | Desktop |
| 6 | Expanded IPC handlers | Desktop |
| 7 | Updated preload API | Desktop |
| 8 | Auth + sync stores | Desktop |
| 9 | LoginPage with server auth | Desktop |
| 10 | SyncIndicator + wire sales | Desktop |
| 11 | SQLite table creation | Desktop |
| 12 | Verify build | Both |
