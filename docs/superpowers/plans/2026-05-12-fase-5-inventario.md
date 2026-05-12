# Fase 5: Inventario - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the inventory management module — server API routes for purchases (compras), transfers (traspasos), stock adjustments, and low-stock alerts; plus the desktop UI for managing inventory from the POS sidebar.

**Architecture:** Server gets new routes for compras and traspasos with stock update logic. Desktop gets new IPC handlers to query inventory data and a full Inventory page with tabs for products, purchases, transfers, and stock alerts.

**Tech Stack:** Fastify routes, Drizzle ORM, PostgreSQL (server), SQLite (desktop), React + Zustand + Tailwind

---

## File Structure

```
apps/server/
  src/
    db/
      schema.ts                       # Modified: add compras, compraDetalles, traspasos, traspasoDetalles
    routes/
      compras.routes.ts               # NEW: purchase CRUD + stock update on receive
      traspasos.routes.ts             # NEW: transfer CRUD + state machine
      stock.routes.ts                 # NEW: stock adjustments + low-stock alerts
    index.ts                          # Modified: register new routes

apps/desktop/
  src/
    main/
      ipc-handlers.ts                 # Modified: add inventory IPC handlers
    preload/
      index.ts                        # Modified: expose inventory channels
    renderer/
      components/
        inventory/
          ProductsTab.tsx             # NEW: product list with search + edit
          PurchasesTab.tsx            # NEW: purchase orders list
          NewPurchaseModal.tsx        # NEW: create purchase order
          TransfersTab.tsx            # NEW: transfers list
          NewTransferModal.tsx        # NEW: create transfer
          StockAlertsTab.tsx          # NEW: low-stock products
      pages/
        InventoryPage.tsx             # NEW: tabbed inventory page
      pages/
        PosPage.tsx                   # Modified: route to InventoryPage
```

---

### Task 1: Server - Add Compras/Traspasos to PG Schema

**Files:**
- Modify: `apps/server/src/db/schema.ts`

- [ ] **Step 1: Read the current schema file**

- [ ] **Step 2: Append compras, compraDetalles, traspasos, traspasoDetalles tables**

Add at the end of `apps/server/src/db/schema.ts`:

```typescript
export const compras = pgTable("compras", {
  id: serial("id").primaryKey(),
  proveedorId: integer("proveedor_id")
    .notNull()
    .references(() => proveedores.id),
  sucursalId: integer("sucursal_id")
    .notNull()
    .references(() => sucursales.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  total: real("total").notNull(),
  estado: text("estado", { enum: ["pendiente", "recibida", "cancelada"] })
    .notNull()
    .default("pendiente"),
  notas: text("notas"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  fechaRecepcion: timestamp("fecha_recepcion", { withTimezone: true }),
  ...syncColumns,
  ...timestampColumns,
});

export const compraDetalles = pgTable("compra_detalles", {
  id: serial("id").primaryKey(),
  compraId: integer("compra_id")
    .notNull()
    .references(() => compras.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: real("cantidad").notNull(),
  costoUnitario: real("costo_unitario").notNull(),
  subtotal: real("subtotal").notNull(),
  ...syncColumns,
});

export const traspasos = pgTable("traspasos", {
  id: serial("id").primaryKey(),
  sucursalOrigenId: integer("sucursal_origen_id")
    .notNull()
    .references(() => sucursales.id),
  sucursalDestinoId: integer("sucursal_destino_id")
    .notNull()
    .references(() => sucursales.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  estado: text("estado", {
    enum: ["pendiente", "en_transito", "recibido", "cancelado"],
  })
    .notNull()
    .default("pendiente"),
  notas: text("notas"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  ...syncColumns,
  ...timestampColumns,
});

export const traspasoDetalles = pgTable("traspaso_detalles", {
  id: serial("id").primaryKey(),
  traspasoId: integer("traspaso_id")
    .notNull()
    .references(() => traspasos.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: real("cantidad").notNull(),
  ...syncColumns,
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/db/schema.ts
git commit -m "feat(server): add compras, traspasos PG schema tables"
```

---

### Task 2: Server - Compras Routes

**Files:**
- Create: `apps/server/src/routes/compras.routes.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Create compras routes**

```typescript
// apps/server/src/routes/compras.routes.ts

import { FastifyInstance } from "fastify";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function comprasRoutes(app: FastifyInstance) {
  // POST /compras — create purchase order
  app.post<{
    Body: {
      proveedorId: number;
      sucursalId: number;
      notas?: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
        costoUnitario: number;
      }>;
    };
  }>("/compras", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const body = request.body;
      const total = body.detalles.reduce(
        (sum, d) => sum + d.cantidad * d.costoUnitario,
        0
      );

      const [compra] = await db
        .insert(schema.compras)
        .values({
          proveedorId: body.proveedorId,
          sucursalId: body.sucursalId,
          usuarioId: request.user!.userId,
          total,
          estado: "pendiente",
          notas: body.notas || null,
        })
        .returning();

      if (body.detalles.length > 0) {
        await db.insert(schema.compraDetalles).values(
          body.detalles.map((d) => ({
            compraId: compra.id,
            productoId: d.productoId,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario,
            subtotal: d.cantidad * d.costoUnitario,
          }))
        );
      }

      return compra;
    },
  });

  // GET /compras — list with pagination
  app.get<{
    Querystring: { page?: string; limit?: string; estado?: string };
  }>("/compras", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.estado) {
        conditions.push(eq(schema.compras.estado, request.query.estado as any));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.compras)
        .where(where)
        .orderBy(desc(schema.compras.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /compras/:id — with detalles
  app.get<{ Params: { id: string } }>("/compras/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const compra = await db
        .select()
        .from(schema.compras)
        .where(eq(schema.compras.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!compra) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const detalles = await db
        .select()
        .from(schema.compraDetalles)
        .where(eq(schema.compraDetalles.compraId, id));

      return { ...compra, detalles };
    },
  });

  // PUT /compras/:id/recibir — receive purchase, update stock
  app.put<{ Params: { id: string } }>("/compras/:id/recibir", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const compra = await db
        .select()
        .from(schema.compras)
        .where(eq(schema.compras.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!compra) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (compra.estado !== "pendiente") {
        return reply
          .status(400)
          .send({ error: "Solo se pueden recibir compras pendientes" });
      }

      // Update compra status
      await db
        .update(schema.compras)
        .set({
          estado: "recibida",
          fechaRecepcion: new Date(),
        })
        .where(eq(schema.compras.id, id));

      // Get detalles and update stock
      const detalles = await db
        .select()
        .from(schema.compraDetalles)
        .where(eq(schema.compraDetalles.compraId, id));

      for (const d of detalles) {
        // Upsert stock
        const existing = await db
          .select()
          .from(schema.stockSucursal)
          .where(
            and(
              eq(schema.stockSucursal.productoId, d.productoId),
              eq(schema.stockSucursal.sucursalId, compra.sucursalId)
            )
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (existing) {
          await db
            .update(schema.stockSucursal)
            .set({
              cantidad: sql`${schema.stockSucursal.cantidad} + ${d.cantidad}`,
            })
            .where(
              and(
                eq(schema.stockSucursal.productoId, d.productoId),
                eq(schema.stockSucursal.sucursalId, compra.sucursalId)
              )
            );
        } else {
          await db.insert(schema.stockSucursal).values({
            productoId: d.productoId,
            sucursalId: compra.sucursalId,
            cantidad: d.cantidad,
          });
        }

        // Update product cost
        await db
          .update(schema.productos)
          .set({ costo: d.costoUnitario })
          .where(eq(schema.productos.id, d.productoId));
      }

      return { status: "recibida" };
    },
  });

  // PUT /compras/:id/cancelar
  app.put<{ Params: { id: string } }>("/compras/:id/cancelar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const compra = await db
        .select()
        .from(schema.compras)
        .where(eq(schema.compras.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!compra) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (compra.estado !== "pendiente") {
        return reply
          .status(400)
          .send({ error: "Solo se pueden cancelar compras pendientes" });
      }

      await db
        .update(schema.compras)
        .set({ estado: "cancelada" })
        .where(eq(schema.compras.id, id));

      return { status: "cancelada" };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { comprasRoutes } from "./routes/compras.routes.js";
// After syncRoutes:
await app.register(comprasRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/compras.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add compras routes with stock update on receive"
```

---

### Task 3: Server - Traspasos Routes

**Files:**
- Create: `apps/server/src/routes/traspasos.routes.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Create traspasos routes**

```typescript
// apps/server/src/routes/traspasos.routes.ts

import { FastifyInstance } from "fastify";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function traspasosRoutes(app: FastifyInstance) {
  // POST /traspasos — create transfer
  app.post<{
    Body: {
      sucursalOrigenId: number;
      sucursalDestinoId: number;
      notas?: string;
      detalles: Array<{
        productoId: number;
        cantidad: number;
      }>;
    };
  }>("/traspasos", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const body = request.body;

      if (body.sucursalOrigenId === body.sucursalDestinoId) {
        return reply
          .status(400)
          .send({ error: "Origen y destino deben ser diferentes" });
      }

      const [traspaso] = await db
        .insert(schema.traspasos)
        .values({
          sucursalOrigenId: body.sucursalOrigenId,
          sucursalDestinoId: body.sucursalDestinoId,
          usuarioId: request.user!.userId,
          estado: "pendiente",
          notas: body.notas || null,
        })
        .returning();

      if (body.detalles.length > 0) {
        await db.insert(schema.traspasoDetalles).values(
          body.detalles.map((d) => ({
            traspasoId: traspaso.id,
            productoId: d.productoId,
            cantidad: d.cantidad,
          }))
        );
      }

      return traspaso;
    },
  });

  // GET /traspasos
  app.get<{
    Querystring: { page?: string; limit?: string; estado?: string };
  }>("/traspasos", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const page = parseInt(request.query.page || "1", 10);
      const limit = parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];
      if (request.query.estado) {
        conditions.push(
          eq(schema.traspasos.estado, request.query.estado as any)
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(schema.traspasos)
        .where(where)
        .orderBy(desc(schema.traspasos.fecha))
        .limit(limit)
        .offset(offset);

      return { data: rows, page, limit };
    },
  });

  // GET /traspasos/:id
  app.get<{ Params: { id: string } }>("/traspasos/:id", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const detalles = await db
        .select()
        .from(schema.traspasoDetalles)
        .where(eq(schema.traspasoDetalles.traspasoId, id));

      return { ...traspaso, detalles };
    },
  });

  // PUT /traspasos/:id/enviar — mark as in-transit, deduct from origin
  app.put<{ Params: { id: string } }>("/traspasos/:id/enviar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso || traspaso.estado !== "pendiente") {
        return reply
          .status(400)
          .send({ error: "Solo traspasos pendientes pueden enviarse" });
      }

      const detalles = await db
        .select()
        .from(schema.traspasoDetalles)
        .where(eq(schema.traspasoDetalles.traspasoId, id));

      // Deduct stock from origin
      for (const d of detalles) {
        await db
          .update(schema.stockSucursal)
          .set({
            cantidad: sql`${schema.stockSucursal.cantidad} - ${d.cantidad}`,
          })
          .where(
            and(
              eq(schema.stockSucursal.productoId, d.productoId),
              eq(schema.stockSucursal.sucursalId, traspaso.sucursalOrigenId)
            )
          );
      }

      await db
        .update(schema.traspasos)
        .set({ estado: "en_transito" })
        .where(eq(schema.traspasos.id, id));

      return { status: "en_transito" };
    },
  });

  // PUT /traspasos/:id/recibir — receive at destination, add stock
  app.put<{ Params: { id: string } }>("/traspasos/:id/recibir", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso || traspaso.estado !== "en_transito") {
        return reply
          .status(400)
          .send({ error: "Solo traspasos en transito pueden recibirse" });
      }

      const detalles = await db
        .select()
        .from(schema.traspasoDetalles)
        .where(eq(schema.traspasoDetalles.traspasoId, id));

      // Add stock to destination
      for (const d of detalles) {
        const existing = await db
          .select()
          .from(schema.stockSucursal)
          .where(
            and(
              eq(schema.stockSucursal.productoId, d.productoId),
              eq(schema.stockSucursal.sucursalId, traspaso.sucursalDestinoId)
            )
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (existing) {
          await db
            .update(schema.stockSucursal)
            .set({
              cantidad: sql`${schema.stockSucursal.cantidad} + ${d.cantidad}`,
            })
            .where(
              and(
                eq(schema.stockSucursal.productoId, d.productoId),
                eq(schema.stockSucursal.sucursalId, traspaso.sucursalDestinoId)
              )
            );
        } else {
          await db.insert(schema.stockSucursal).values({
            productoId: d.productoId,
            sucursalId: traspaso.sucursalDestinoId,
            cantidad: d.cantidad,
          });
        }
      }

      await db
        .update(schema.traspasos)
        .set({ estado: "recibido" })
        .where(eq(schema.traspasos.id, id));

      return { status: "recibido" };
    },
  });

  // PUT /traspasos/:id/cancelar
  app.put<{ Params: { id: string } }>("/traspasos/:id/cancelar", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const traspaso = await db
        .select()
        .from(schema.traspasos)
        .where(eq(schema.traspasos.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!traspaso) {
        return reply.status(404).send({ error: "Not Found" });
      }

      if (traspaso.estado === "recibido") {
        return reply
          .status(400)
          .send({ error: "No se puede cancelar un traspaso ya recibido" });
      }

      // If en_transito, return stock to origin
      if (traspaso.estado === "en_transito") {
        const detalles = await db
          .select()
          .from(schema.traspasoDetalles)
          .where(eq(schema.traspasoDetalles.traspasoId, id));

        for (const d of detalles) {
          await db
            .update(schema.stockSucursal)
            .set({
              cantidad: sql`${schema.stockSucursal.cantidad} + ${d.cantidad}`,
            })
            .where(
              and(
                eq(schema.stockSucursal.productoId, d.productoId),
                eq(
                  schema.stockSucursal.sucursalId,
                  traspaso.sucursalOrigenId
                )
              )
            );
        }
      }

      await db
        .update(schema.traspasos)
        .set({ estado: "cancelado" })
        .where(eq(schema.traspasos.id, id));

      return { status: "cancelado" };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { traspasosRoutes } from "./routes/traspasos.routes.js";
await app.register(traspasosRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/traspasos.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add traspasos routes with stock state machine"
```

---

### Task 4: Server - Stock Routes (Adjustments + Alerts)

**Files:**
- Create: `apps/server/src/routes/stock.routes.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Create stock routes**

```typescript
// apps/server/src/routes/stock.routes.ts

import { FastifyInstance } from "fastify";
import { eq, and, sql, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function stockRoutes(app: FastifyInstance) {
  // GET /stock/alerts?sucursalId=N — products below minimum stock
  app.get<{
    Querystring: { sucursalId: string };
  }>("/stock/alerts", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const sucursalId = parseInt(request.query.sucursalId, 10);

      const rows = await db
        .select({
          productoId: schema.stockSucursal.productoId,
          productoNombre: schema.productos.nombre,
          sku: schema.productos.sku,
          cantidad: schema.stockSucursal.cantidad,
          stockMinimo: schema.productos.stockMinimo,
        })
        .from(schema.stockSucursal)
        .innerJoin(
          schema.productos,
          eq(schema.stockSucursal.productoId, schema.productos.id)
        )
        .where(
          and(
            eq(schema.stockSucursal.sucursalId, sucursalId),
            lte(
              schema.stockSucursal.cantidad,
              sql`${schema.productos.stockMinimo}`
            ),
            eq(schema.productos.activo, true)
          )
        );

      return { data: rows };
    },
  });

  // GET /stock/:sucursalId — all stock for a branch
  app.get<{
    Params: { sucursalId: string };
  }>("/stock/:sucursalId", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const sucursalId = parseInt(request.params.sucursalId, 10);

      const rows = await db
        .select({
          productoId: schema.stockSucursal.productoId,
          productoNombre: schema.productos.nombre,
          sku: schema.productos.sku,
          codigoBarras: schema.productos.codigoBarras,
          cantidad: schema.stockSucursal.cantidad,
          stockMinimo: schema.productos.stockMinimo,
          precioVenta: schema.productos.precioVenta,
          costo: schema.productos.costo,
        })
        .from(schema.stockSucursal)
        .innerJoin(
          schema.productos,
          eq(schema.stockSucursal.productoId, schema.productos.id)
        )
        .where(
          and(
            eq(schema.stockSucursal.sucursalId, sucursalId),
            eq(schema.productos.activo, true)
          )
        );

      return { data: rows };
    },
  });

  // POST /stock/adjust — manual stock adjustment
  app.post<{
    Body: {
      productoId: number;
      sucursalId: number;
      cantidad: number;
      motivo: string;
    };
  }>("/stock/adjust", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const { productoId, sucursalId, cantidad, motivo } = request.body;

      const existing = await db
        .select()
        .from(schema.stockSucursal)
        .where(
          and(
            eq(schema.stockSucursal.productoId, productoId),
            eq(schema.stockSucursal.sucursalId, sucursalId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        await db
          .update(schema.stockSucursal)
          .set({ cantidad })
          .where(
            and(
              eq(schema.stockSucursal.productoId, productoId),
              eq(schema.stockSucursal.sucursalId, sucursalId)
            )
          );
      } else {
        await db.insert(schema.stockSucursal).values({
          productoId,
          sucursalId,
          cantidad,
        });
      }

      return { status: "adjusted", productoId, sucursalId, cantidad, motivo };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { stockRoutes } from "./routes/stock.routes.js";
await app.register(stockRoutes);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/server && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/stock.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add stock routes - adjustments and low-stock alerts"
```

---

### Task 5: Desktop - Inventory IPC Handlers + Preload

**Files:**
- Modify: `apps/desktop/src/main/ipc-handlers.ts`
- Modify: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Add inventory IPC handlers**

Read `apps/desktop/src/main/ipc-handlers.ts`, then add these handlers inside `registerIpcHandlers`:

```typescript
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
    // Return products where local data shows low stock
    // In a connected state, this could query the server
    return db
      .select()
      .from(schema.productos)
      .where(eq(schema.productos.activo, true))
      .all()
      .then((products) =>
        products.filter((p) => {
          // Simple check - full stock check needs stockSucursal
          return p.stockMinimo > 0;
        })
      );
  });
```

- [ ] **Step 2: Add inventory channels to preload**

Read `apps/desktop/src/preload/index.ts`, then add to the `api` object:

```typescript
  inventory: {
    products: (query?: string) =>
      ipcRenderer.invoke("inventory:products", query),
    stockAlerts: () => ipcRenderer.invoke("inventory:stock-alerts"),
  },
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/ipc-handlers.ts apps/desktop/src/preload/index.ts
git commit -m "feat(desktop): add inventory IPC handlers and preload channels"
```

---

### Task 6: Desktop - Inventory Page with Tabs

**Files:**
- Create: `apps/desktop/src/renderer/components/inventory/ProductsTab.tsx`
- Create: `apps/desktop/src/renderer/components/inventory/StockAlertsTab.tsx`
- Create: `apps/desktop/src/renderer/pages/InventoryPage.tsx`
- Modify: `apps/desktop/src/renderer/pages/PosPage.tsx`

- [ ] **Step 1: Create ProductsTab**

```tsx
// apps/desktop/src/renderer/components/inventory/ProductsTab.tsx

import { useState, useEffect } from "react";
import { Search, Package } from "lucide-react";
import { formatCurrency } from "../../lib/format";

export function ProductsTab() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (search?: string) => {
    const result = await window.api.inventory.products(search);
    setProducts(result);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    loadProducts(value);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted"
            size={18}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar producto por nombre o SKU..."
            className="w-full bg-pos-card border border-slate-700 text-pos-text placeholder:text-slate-500 pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pos-blue"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-full text-pos-muted">
            <div className="text-center">
              <Package size={48} className="mx-auto mb-2 opacity-50" />
              <p>No hay productos</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-pos-card border-b border-slate-700">
              <tr className="text-pos-muted text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">Producto</th>
                <th className="text-left py-3 px-4 w-28">SKU</th>
                <th className="text-left py-3 px-4 w-36">Codigo Barras</th>
                <th className="text-right py-3 px-4 w-28">Costo</th>
                <th className="text-right py-3 px-4 w-28">Precio</th>
                <th className="text-center py-3 px-4 w-20">Activo</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-800 hover:bg-pos-active/50 transition-colors"
                >
                  <td className="py-3 px-4 text-pos-text font-medium">
                    {p.nombre}
                  </td>
                  <td className="py-3 px-4 text-pos-muted text-sm">
                    {p.sku || "—"}
                  </td>
                  <td className="py-3 px-4 text-pos-muted text-sm font-mono">
                    {p.codigoBarras || "—"}
                  </td>
                  <td className="py-3 px-4 text-right text-pos-muted tabular-nums">
                    {formatCurrency(p.costo)}
                  </td>
                  <td className="py-3 px-4 text-right text-pos-green font-medium tabular-nums">
                    {formatCurrency(p.precioVenta)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        p.activo ? "bg-pos-green" : "bg-pos-red"
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create StockAlertsTab**

```tsx
// apps/desktop/src/renderer/components/inventory/StockAlertsTab.tsx

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export function StockAlertsTab() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const result = await window.api.inventory.stockAlerts();
    setAlerts(result);
  };

  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-pos-muted">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-2 opacity-50" />
          <p>Sin alertas de stock</p>
          <p className="text-sm mt-1">
            Todos los productos estan por encima del minimo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {alerts.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-pos-card border border-slate-700 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-pos-text font-medium">{p.nombre}</p>
              <p className="text-pos-muted text-xs">
                SKU: {p.sku || "—"} | Stock minimo: {p.stockMinimo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-pos-amber" />
              <span className="text-pos-amber font-bold text-sm">
                Revisar stock
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create InventoryPage**

```tsx
// apps/desktop/src/renderer/pages/InventoryPage.tsx

import { useState } from "react";
import { Package, AlertTriangle } from "lucide-react";
import { ProductsTab } from "../components/inventory/ProductsTab";
import { StockAlertsTab } from "../components/inventory/StockAlertsTab";

const tabs = [
  { id: "products", label: "Productos", icon: <Package size={16} /> },
  { id: "alerts", label: "Alertas Stock", icon: <AlertTriangle size={16} /> },
];

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 pt-4 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium cursor-pointer transition-colors
              ${
                activeTab === tab.id
                  ? "bg-pos-card text-pos-text border-t border-x border-slate-700"
                  : "text-pos-muted hover:text-pos-text"
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-pos-card border-t border-slate-700 overflow-hidden">
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "alerts" && <StockAlertsTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire InventoryPage into PosPage**

Read `apps/desktop/src/renderer/pages/PosPage.tsx`, then:
- Add import: `import { InventoryPage } from "./InventoryPage";`
- Replace the placeholder for `activeSection !== "pos"` to handle "inventory":

```tsx
{activeSection === "inventory" && <InventoryPage />}

{activeSection !== "pos" && activeSection !== "inventory" && (
  <div className="flex-1 flex items-center justify-center text-pos-muted">
    <p className="text-lg">
      Modulo "{activeSection}" — disponible en fases posteriores
    </p>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/components/inventory/ apps/desktop/src/renderer/pages/InventoryPage.tsx apps/desktop/src/renderer/pages/PosPage.tsx
git commit -m "feat(desktop): add inventory page with products tab and stock alerts"
```

---

### Task 7: Verify Build

- [ ] **Step 1: Verify server compiles**

Run: `cd apps/server && npx tsc --noEmit`

- [ ] **Step 2: Verify desktop builds**

Run: `cd apps/desktop && pnpm build`

- [ ] **Step 3: Fix errors and commit**

```bash
git add .
git commit -m "fix: fix build errors for Phase 5"
```

---

## Summary

| Task | Description | Scope |
|------|-------------|-------|
| 1 | Compras/Traspasos PG schema | Server |
| 2 | Compras routes + stock update | Server |
| 3 | Traspasos routes + state machine | Server |
| 4 | Stock routes (alerts + adjustments) | Server |
| 5 | Inventory IPC + preload | Desktop |
| 6 | Inventory page with tabs | Desktop |
| 7 | Verify build | Both |
