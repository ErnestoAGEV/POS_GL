# Fase 1: Monorepo + Base de Datos + Paquete Shared - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the monorepo structure, define all database schemas with Drizzle ORM (dual SQLite/PostgreSQL), create shared types and SAT catalogs, and verify everything works end-to-end with tests.

**Architecture:** pnpm workspaces + Turborepo monorepo with three apps (desktop, server, web) and one shared package (@posgl/shared). Drizzle ORM schemas are defined once in shared and exported for both SQLite (desktop) and PostgreSQL (server). SAT catalogs are static TypeScript constants.

**Tech Stack:** pnpm, Turborepo, TypeScript 5.5+, Drizzle ORM, better-sqlite3, PostgreSQL 17, Vitest

---

## File Structure

```
posgl/
  package.json                          # Root workspace config
  pnpm-workspace.yaml                   # Workspace declaration
  turbo.json                            # Turborepo pipeline config
  tsconfig.base.json                    # Shared TS config
  .gitignore                            # Global ignores
  packages/
    shared/
      package.json
      tsconfig.json
      src/
        index.ts                        # Main barrel export
        schemas/
          index.ts                      # Schema barrel export
          sucursal.ts                   # Sucursal schema
          terminal.ts                   # Terminal schema
          usuario.ts                    # Usuario schema
          categoria.ts                  # Categoria schema
          producto.ts                   # Producto schema
          stock-sucursal.ts             # StockSucursal schema
          cliente.ts                    # Cliente schema
          proveedor.ts                  # Proveedor schema
          venta.ts                      # Venta + VentaDetalle schemas
          pago.ts                       # Pago schema
          factura.ts                    # Factura schema
          corte-caja.ts                 # CorteCaja + MovimientoCaja schemas
          compra.ts                     # Compra + CompraDetalle schemas
          traspaso.ts                   # Traspaso + TraspasoDetalle schemas
          promocion.ts                  # Promocion schema
          tarjeta-regalo.ts             # TarjetaRegalo + Movimiento schemas
          apartado.ts                   # Apartado + ApartadoAbono schemas
          bitacora.ts                   # Bitacora schema
          _columns.ts                   # Shared column helpers (sync fields, timestamps)
        catalogs/
          index.ts                      # Catalog barrel export
          formas-pago.ts                # SAT formas de pago
          regimen-fiscal.ts             # SAT regimen fiscal
          uso-cfdi.ts                   # SAT uso CFDI
          metodo-pago.ts                # SAT metodo de pago
          moneda.ts                     # SAT moneda
          tipo-comprobante.ts           # SAT tipo comprobante
        types/
          index.ts                      # Types barrel export
          enums.ts                      # Shared enums (roles, estados, formas de pago internas)
      tests/
        schemas.test.ts                 # Schema validation tests
        catalogs.test.ts                # Catalog completeness tests
  apps/
    server/
      package.json
      tsconfig.json
      drizzle.config.ts                 # Drizzle Kit config for PostgreSQL
      src/
        db/
          index.ts                      # PostgreSQL connection + drizzle instance
          migrate.ts                    # Migration runner
          seed.ts                       # Dev seed data
    desktop/
      package.json
      tsconfig.json
      drizzle.config.ts                 # Drizzle Kit config for SQLite
      src/
        db/
          index.ts                      # SQLite connection + drizzle instance
          migrate.ts                    # Migration runner
```

---

### Task 1: Initialize Monorepo Root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "posgl",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.5.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.turbo/
*.db
*.sqlite
.env
.env.*
!.env.example
```

- [ ] **Step 6: Install root dependencies**

Run: `pnpm install`
Expected: `turbo` installed, lockfile created

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore pnpm-lock.yaml
git commit -m "feat: initialize monorepo with pnpm workspaces and Turborepo"
```

---

### Task 2: Create @posgl/shared Package Skeleton

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@posgl/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./schemas": {
      "import": "./dist/schemas/index.js",
      "types": "./dist/schemas/index.d.ts"
    },
    "./catalogs": {
      "import": "./dist/catalogs/index.js",
      "types": "./dist/catalogs/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.2.0",
    "@types/uuid": "^10.0.0",
    "better-sqlite3": "^11.8.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create packages/shared/src/index.ts**

```typescript
export * from "./schemas/index.js";
export * from "./catalogs/index.js";
export * from "./types/index.js";
```

- [ ] **Step 4: Install dependencies**

Run: `cd packages/shared && pnpm install`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/package.json packages/shared/tsconfig.json packages/shared/src/index.ts
git commit -m "feat: create @posgl/shared package skeleton"
```

---

### Task 3: Define Shared Column Helpers and Enums

**Files:**
- Create: `packages/shared/src/schemas/_columns.ts`
- Create: `packages/shared/src/types/enums.ts`
- Create: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Create shared enums**

```typescript
// packages/shared/src/types/enums.ts

export const UserRole = {
  ADMIN: "admin",
  CAJERO: "cajero",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const VentaTipo = {
  NORMAL: "normal",
  APARTADO: "apartado",
  COTIZACION: "cotizacion",
} as const;
export type VentaTipo = (typeof VentaTipo)[keyof typeof VentaTipo];

export const VentaEstado = {
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  EN_ESPERA: "en_espera",
  COTIZACION: "cotizacion",
} as const;
export type VentaEstado = (typeof VentaEstado)[keyof typeof VentaEstado];

export const FormaPagoInterna = {
  EFECTIVO: "efectivo",
  TARJETA: "tarjeta",
  TRANSFERENCIA: "transferencia",
  CREDITO: "credito",
  VALE_DESPENSA: "vale_despensa",
  TARJETA_REGALO: "tarjeta_regalo",
} as const;
export type FormaPagoInterna = (typeof FormaPagoInterna)[keyof typeof FormaPagoInterna];

export const CorteTipo = {
  PARCIAL: "parcial",
  FINAL: "final",
} as const;
export type CorteTipo = (typeof CorteTipo)[keyof typeof CorteTipo];

export const MovimientoCajaTipo = {
  ENTRADA: "entrada",
  SALIDA: "salida",
} as const;
export type MovimientoCajaTipo = (typeof MovimientoCajaTipo)[keyof typeof MovimientoCajaTipo];

export const TraspasoEstado = {
  PENDIENTE: "pendiente",
  EN_TRANSITO: "en_transito",
  RECIBIDO: "recibido",
  CANCELADO: "cancelado",
} as const;
export type TraspasoEstado = (typeof TraspasoEstado)[keyof typeof TraspasoEstado];

export const PromocionTipo = {
  DOS_POR_UNO: "2x1",
  N_POR_PRECIO: "nxprecio",
  PORCENTAJE: "porcentaje",
  MONTO_FIJO: "monto_fijo",
} as const;
export type PromocionTipo = (typeof PromocionTipo)[keyof typeof PromocionTipo];

export const FacturaTipo = {
  INDIVIDUAL: "individual",
  GLOBAL: "global",
  NOTA_CREDITO: "nota_credito",
  COMPLEMENTO: "complemento",
} as const;
export type FacturaTipo = (typeof FacturaTipo)[keyof typeof FacturaTipo];

export const FacturaEstado = {
  TIMBRADA: "timbrada",
  CANCELADA: "cancelada",
} as const;
export type FacturaEstado = (typeof FacturaEstado)[keyof typeof FacturaEstado];

export const ApartadoEstado = {
  ACTIVO: "activo",
  LIQUIDADO: "liquidado",
  CANCELADO: "cancelado",
} as const;
export type ApartadoEstado = (typeof ApartadoEstado)[keyof typeof ApartadoEstado];

export const SyncStatus = {
  PENDIENTE: "pendiente",
  SINCRONIZADO: "sincronizado",
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];
```

- [ ] **Step 2: Create types barrel export**

```typescript
// packages/shared/src/types/index.ts

export * from "./enums.js";
```

- [ ] **Step 3: Create shared column helpers**

```typescript
// packages/shared/src/schemas/_columns.ts

import { text, integer } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";

export const syncColumns = {
  syncId: text("sync_id").$defaultFn(() => uuidv4()).notNull().unique(),
  updatedAt: text("updated_at")
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString())
    .notNull(),
  syncStatus: text("sync_status", { enum: ["pendiente", "sincronizado"] })
    .default("pendiente")
    .notNull(),
};

export const timestampColumns = {
  createdAt: text("created_at")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/enums.ts packages/shared/src/types/index.ts packages/shared/src/schemas/_columns.ts
git commit -m "feat: add shared enums and column helpers for sync fields"
```

---

### Task 4: Define Core Schemas (Sucursal, Terminal, Usuario, Categoria)

**Files:**
- Create: `packages/shared/src/schemas/sucursal.ts`
- Create: `packages/shared/src/schemas/terminal.ts`
- Create: `packages/shared/src/schemas/usuario.ts`
- Create: `packages/shared/src/schemas/categoria.ts`

- [ ] **Step 1: Create Sucursal schema**

```typescript
// packages/shared/src/schemas/sucursal.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";

export const sucursales = sqliteTable("sucursales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  direccion: text("direccion"),
  telefono: text("telefono"),
  rfc: text("rfc"),
  razonSocial: text("razon_social"),
  regimenFiscal: text("regimen_fiscal"),
  codigoPostal: text("codigo_postal"),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 2: Create Terminal schema**

```typescript
// packages/shared/src/schemas/terminal.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { sucursales } from "./sucursal.js";

export const terminales = sqliteTable("terminales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sucursalId: integer("sucursal_id")
    .references(() => sucursales.id)
    .notNull(),
  nombre: text("nombre").notNull(),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 3: Create Usuario schema**

```typescript
// packages/shared/src/schemas/usuario.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { sucursales } from "./sucursal.js";

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["admin", "cajero"] }).notNull(),
  sucursalId: integer("sucursal_id")
    .references(() => sucursales.id)
    .notNull(),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 4: Create Categoria schema**

```typescript
// packages/shared/src/schemas/categoria.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";

export const categorias = sqliteTable("categorias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  categoriaPadreId: integer("categoria_padre_id").references(
    (): any => categorias.id
  ),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/sucursal.ts packages/shared/src/schemas/terminal.ts packages/shared/src/schemas/usuario.ts packages/shared/src/schemas/categoria.ts
git commit -m "feat: add core schemas - sucursal, terminal, usuario, categoria"
```

---

### Task 5: Define Product and Stock Schemas

**Files:**
- Create: `packages/shared/src/schemas/producto.ts`
- Create: `packages/shared/src/schemas/stock-sucursal.ts`

- [ ] **Step 1: Create Producto schema**

```typescript
// packages/shared/src/schemas/producto.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { categorias } from "./categoria.js";

export const productos = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  sku: text("sku").unique(),
  codigoBarras: text("codigo_barras").unique(),
  precioVenta: real("precio_venta").notNull(),
  costo: real("costo").default(0).notNull(),
  categoriaId: integer("categoria_id").references(() => categorias.id),
  stockMinimo: integer("stock_minimo").default(0).notNull(),
  claveSat: text("clave_sat"),
  unidadSat: text("unidad_sat"),
  tasaIva: real("tasa_iva").default(0.16).notNull(),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 2: Create StockSucursal schema**

```typescript
// packages/shared/src/schemas/stock-sucursal.ts

import { sqliteTable, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./_columns.js";
import { productos } from "./producto.js";
import { sucursales } from "./sucursal.js";

export const stockSucursal = sqliteTable(
  "stock_sucursal",
  {
    productoId: integer("producto_id")
      .references(() => productos.id)
      .notNull(),
    sucursalId: integer("sucursal_id")
      .references(() => sucursales.id)
      .notNull(),
    cantidad: real("cantidad").default(0).notNull(),
    ...syncColumns,
  },
  (table) => [
    primaryKey({ columns: [table.productoId, table.sucursalId] }),
  ]
);
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/producto.ts packages/shared/src/schemas/stock-sucursal.ts
git commit -m "feat: add producto and stock-sucursal schemas"
```

---

### Task 6: Define Cliente and Proveedor Schemas

**Files:**
- Create: `packages/shared/src/schemas/cliente.ts`
- Create: `packages/shared/src/schemas/proveedor.ts`

- [ ] **Step 1: Create Cliente schema**

```typescript
// packages/shared/src/schemas/cliente.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  telefono: text("telefono"),
  email: text("email"),
  rfc: text("rfc"),
  razonSocial: text("razon_social"),
  regimenFiscal: text("regimen_fiscal"),
  usoCfdi: text("uso_cfdi"),
  domicilioFiscal: text("domicilio_fiscal"),
  limiteCredito: real("limite_credito").default(0).notNull(),
  saldoCredito: real("saldo_credito").default(0).notNull(),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 2: Create Proveedor schema**

```typescript
// packages/shared/src/schemas/proveedor.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";

export const proveedores = sqliteTable("proveedores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  contacto: text("contacto"),
  telefono: text("telefono"),
  email: text("email"),
  rfc: text("rfc"),
  activo: integer("activo", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/cliente.ts packages/shared/src/schemas/proveedor.ts
git commit -m "feat: add cliente and proveedor schemas"
```

---

### Task 7: Define Venta, VentaDetalle, and Pago Schemas

**Files:**
- Create: `packages/shared/src/schemas/venta.ts`
- Create: `packages/shared/src/schemas/pago.ts`

- [ ] **Step 1: Create Venta and VentaDetalle schemas**

```typescript
// packages/shared/src/schemas/venta.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { terminales } from "./terminal.js";
import { usuarios } from "./usuario.js";
import { clientes } from "./cliente.js";
import { productos } from "./producto.js";

export const ventas = sqliteTable("ventas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  folio: text("folio").notNull().unique(),
  terminalId: integer("terminal_id")
    .references(() => terminales.id)
    .notNull(),
  usuarioId: integer("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  subtotal: real("subtotal").notNull(),
  descuento: real("descuento").default(0).notNull(),
  iva: real("iva").notNull(),
  total: real("total").notNull(),
  tipo: text("tipo", { enum: ["normal", "apartado", "cotizacion"] })
    .default("normal")
    .notNull(),
  estado: text("estado", {
    enum: ["completada", "cancelada", "en_espera", "cotizacion"],
  })
    .default("completada")
    .notNull(),
  fecha: text("fecha")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const ventaDetalles = sqliteTable("venta_detalles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id")
    .references(() => ventas.id)
    .notNull(),
  productoId: integer("producto_id")
    .references(() => productos.id)
    .notNull(),
  cantidad: real("cantidad").notNull(),
  precioUnitario: real("precio_unitario").notNull(),
  descuento: real("descuento").default(0).notNull(),
  subtotal: real("subtotal").notNull(),
  ...syncColumns,
});
```

- [ ] **Step 2: Create Pago schema**

```typescript
// packages/shared/src/schemas/pago.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./_columns.js";
import { ventas } from "./venta.js";

export const pagos = sqliteTable("pagos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id")
    .references(() => ventas.id)
    .notNull(),
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

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/venta.ts packages/shared/src/schemas/pago.ts
git commit -m "feat: add venta, venta-detalle, and pago schemas"
```

---

### Task 8: Define Factura Schema

**Files:**
- Create: `packages/shared/src/schemas/factura.ts`

- [ ] **Step 1: Create Factura schema**

```typescript
// packages/shared/src/schemas/factura.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { clientes } from "./cliente.js";

export const facturas = sqliteTable("facturas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaIds: text("venta_ids").notNull(), // JSON array of venta IDs
  clienteId: integer("cliente_id").references(() => clientes.id),
  uuidFiscal: text("uuid_fiscal"),
  xml: text("xml"),
  pdf: text("pdf"), // file path
  tipo: text("tipo", {
    enum: ["individual", "global", "nota_credito", "complemento"],
  }).notNull(),
  estado: text("estado", { enum: ["timbrada", "cancelada"] })
    .default("timbrada")
    .notNull(),
  serieSat: text("serie_sat"),
  folioSat: text("folio_sat"),
  fecha: text("fecha")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/factura.ts
git commit -m "feat: add factura schema with CFDI fields"
```

---

### Task 9: Define CorteCaja and MovimientoCaja Schemas

**Files:**
- Create: `packages/shared/src/schemas/corte-caja.ts`

- [ ] **Step 1: Create CorteCaja and MovimientoCaja schemas**

```typescript
// packages/shared/src/schemas/corte-caja.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { terminales } from "./terminal.js";
import { usuarios } from "./usuario.js";

export const cortesCaja = sqliteTable("cortes_caja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  terminalId: integer("terminal_id")
    .references(() => terminales.id)
    .notNull(),
  usuarioId: integer("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  tipo: text("tipo", { enum: ["parcial", "final"] }).notNull(),
  efectivoInicial: real("efectivo_inicial").default(0).notNull(),
  efectivoSistema: real("efectivo_sistema").default(0).notNull(),
  efectivoDeclarado: real("efectivo_declarado"),
  diferencia: real("diferencia"),
  totalVentas: real("total_ventas").default(0).notNull(),
  totalEfectivo: real("total_efectivo").default(0).notNull(),
  totalTarjeta: real("total_tarjeta").default(0).notNull(),
  totalTransferencia: real("total_transferencia").default(0).notNull(),
  totalOtros: real("total_otros").default(0).notNull(),
  fechaApertura: text("fecha_apertura").notNull(),
  fechaCierre: text("fecha_cierre"),
  ...syncColumns,
  ...timestampColumns,
});

export const movimientosCaja = sqliteTable("movimientos_caja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  corteId: integer("corte_id")
    .references(() => cortesCaja.id)
    .notNull(),
  tipo: text("tipo", { enum: ["entrada", "salida"] }).notNull(),
  monto: real("monto").notNull(),
  concepto: text("concepto").notNull(),
  fecha: text("fecha")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  ...syncColumns,
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/corte-caja.ts
git commit -m "feat: add corte-caja and movimiento-caja schemas"
```

---

### Task 10: Define Compra, Traspaso, Promocion, TarjetaRegalo, Apartado, Bitacora Schemas

**Files:**
- Create: `packages/shared/src/schemas/compra.ts`
- Create: `packages/shared/src/schemas/traspaso.ts`
- Create: `packages/shared/src/schemas/promocion.ts`
- Create: `packages/shared/src/schemas/tarjeta-regalo.ts`
- Create: `packages/shared/src/schemas/apartado.ts`
- Create: `packages/shared/src/schemas/bitacora.ts`

- [ ] **Step 1: Create Compra schemas**

```typescript
// packages/shared/src/schemas/compra.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { proveedores } from "./proveedor.js";
import { sucursales } from "./sucursal.js";
import { productos } from "./producto.js";

export const compras = sqliteTable("compras", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  proveedorId: integer("proveedor_id")
    .references(() => proveedores.id)
    .notNull(),
  sucursalId: integer("sucursal_id")
    .references(() => sucursales.id)
    .notNull(),
  total: real("total").notNull(),
  fecha: text("fecha")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const compraDetalles = sqliteTable("compra_detalles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  compraId: integer("compra_id")
    .references(() => compras.id)
    .notNull(),
  productoId: integer("producto_id")
    .references(() => productos.id)
    .notNull(),
  cantidad: real("cantidad").notNull(),
  costoUnitario: real("costo_unitario").notNull(),
  ...syncColumns,
});
```

- [ ] **Step 2: Create Traspaso schemas**

```typescript
// packages/shared/src/schemas/traspaso.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { sucursales } from "./sucursal.js";
import { usuarios } from "./usuario.js";
import { productos } from "./producto.js";

export const traspasos = sqliteTable("traspasos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sucursalOrigenId: integer("sucursal_origen_id")
    .references(() => sucursales.id)
    .notNull(),
  sucursalDestinoId: integer("sucursal_destino_id")
    .references(() => sucursales.id)
    .notNull(),
  usuarioId: integer("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  estado: text("estado", {
    enum: ["pendiente", "en_transito", "recibido", "cancelado"],
  })
    .default("pendiente")
    .notNull(),
  fecha: text("fecha")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const traspasoDetalles = sqliteTable("traspaso_detalles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  traspasoId: integer("traspaso_id")
    .references(() => traspasos.id)
    .notNull(),
  productoId: integer("producto_id")
    .references(() => productos.id)
    .notNull(),
  cantidad: real("cantidad").notNull(),
  ...syncColumns,
});
```

- [ ] **Step 3: Create Promocion schema**

```typescript
// packages/shared/src/schemas/promocion.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { productos } from "./producto.js";
import { categorias } from "./categoria.js";

export const promociones = sqliteTable("promociones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", {
    enum: ["2x1", "nxprecio", "porcentaje", "monto_fijo"],
  }).notNull(),
  valor: real("valor").notNull(), // percentage, fixed amount, or N quantity
  precioObjetivo: real("precio_objetivo"), // target price for nxprecio (e.g., 3x$100 -> valor=3, precioObjetivo=100)
  productoId: integer("producto_id").references(() => productos.id),
  categoriaId: integer("categoria_id").references(() => categorias.id),
  fechaInicio: text("fecha_inicio").notNull(),
  fechaFin: text("fecha_fin").notNull(),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});
```

- [ ] **Step 4: Create TarjetaRegalo schemas**

```typescript
// packages/shared/src/schemas/tarjeta-regalo.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { clientes } from "./cliente.js";
import { ventas } from "./venta.js";

export const tarjetasRegalo = sqliteTable("tarjetas_regalo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  saldo: real("saldo").default(0).notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  activa: integer("activa", { mode: "boolean" }).default(true).notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const tarjetaRegaloMovimientos = sqliteTable(
  "tarjeta_regalo_movimientos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tarjetaId: integer("tarjeta_id")
      .references(() => tarjetasRegalo.id)
      .notNull(),
    tipo: text("tipo", { enum: ["carga", "consumo"] }).notNull(),
    monto: real("monto").notNull(),
    ventaId: integer("venta_id").references(() => ventas.id),
    fecha: text("fecha")
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    ...syncColumns,
  }
);
```

- [ ] **Step 5: Create Apartado schemas**

```typescript
// packages/shared/src/schemas/apartado.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { syncColumns, timestampColumns } from "./_columns.js";
import { ventas } from "./venta.js";

export const apartados = sqliteTable("apartados", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id")
    .references(() => ventas.id)
    .notNull(),
  enganche: real("enganche").notNull(),
  saldoPendiente: real("saldo_pendiente").notNull(),
  estado: text("estado", { enum: ["activo", "liquidado", "cancelado"] })
    .default("activo")
    .notNull(),
  ...syncColumns,
  ...timestampColumns,
});

export const apartadoAbonos = sqliteTable("apartado_abonos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apartadoId: integer("apartado_id")
    .references(() => apartados.id)
    .notNull(),
  monto: real("monto").notNull(),
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
  fecha: text("fecha")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  ...syncColumns,
});
```

- [ ] **Step 6: Create Bitacora schema**

```typescript
// packages/shared/src/schemas/bitacora.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./_columns.js";
import { usuarios } from "./usuario.js";

export const bitacora = sqliteTable("bitacora", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuarioId: integer("usuario_id")
    .references(() => usuarios.id)
    .notNull(),
  accion: text("accion").notNull(), // "venta_creada", "precio_modificado", "devolucion", etc.
  entidad: text("entidad").notNull(), // "venta", "producto", "corte_caja", etc.
  entidadId: integer("entidad_id"),
  descripcion: text("descripcion"),
  fecha: text("fecha")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  ...syncColumns,
});
```

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/schemas/compra.ts packages/shared/src/schemas/traspaso.ts packages/shared/src/schemas/promocion.ts packages/shared/src/schemas/tarjeta-regalo.ts packages/shared/src/schemas/apartado.ts packages/shared/src/schemas/bitacora.ts
git commit -m "feat: add remaining schemas - compra, traspaso, promocion, tarjeta-regalo, apartado, bitacora"
```

---

### Task 11: Create Schema Barrel Export

**Files:**
- Create: `packages/shared/src/schemas/index.ts`

- [ ] **Step 1: Create schemas barrel export**

```typescript
// packages/shared/src/schemas/index.ts

export * from "./sucursal.js";
export * from "./terminal.js";
export * from "./usuario.js";
export * from "./categoria.js";
export * from "./producto.js";
export * from "./stock-sucursal.js";
export * from "./cliente.js";
export * from "./proveedor.js";
export * from "./venta.js";
export * from "./pago.js";
export * from "./factura.js";
export * from "./corte-caja.js";
export * from "./compra.js";
export * from "./traspaso.js";
export * from "./promocion.js";
export * from "./tarjeta-regalo.js";
export * from "./apartado.js";
export * from "./bitacora.js";
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/index.ts
git commit -m "feat: add schemas barrel export"
```

---

### Task 12: Create SAT Catalogs

**Files:**
- Create: `packages/shared/src/catalogs/formas-pago.ts`
- Create: `packages/shared/src/catalogs/regimen-fiscal.ts`
- Create: `packages/shared/src/catalogs/uso-cfdi.ts`
- Create: `packages/shared/src/catalogs/metodo-pago.ts`
- Create: `packages/shared/src/catalogs/moneda.ts`
- Create: `packages/shared/src/catalogs/tipo-comprobante.ts`
- Create: `packages/shared/src/catalogs/index.ts`

- [ ] **Step 1: Create formas de pago SAT**

```typescript
// packages/shared/src/catalogs/formas-pago.ts

export interface FormaPagoSat {
  clave: string;
  descripcion: string;
}

export const FORMAS_PAGO_SAT: FormaPagoSat[] = [
  { clave: "01", descripcion: "Efectivo" },
  { clave: "02", descripcion: "Cheque nominativo" },
  { clave: "03", descripcion: "Transferencia electrónica de fondos" },
  { clave: "04", descripcion: "Tarjeta de crédito" },
  { clave: "05", descripcion: "Monedero electrónico" },
  { clave: "06", descripcion: "Dinero electrónico" },
  { clave: "08", descripcion: "Vales de despensa" },
  { clave: "12", descripcion: "Dación en pago" },
  { clave: "13", descripcion: "Pago por subrogación" },
  { clave: "14", descripcion: "Pago por consignación" },
  { clave: "15", descripcion: "Condonación" },
  { clave: "17", descripcion: "Compensación" },
  { clave: "23", descripcion: "Novación" },
  { clave: "24", descripcion: "Confusión" },
  { clave: "25", descripcion: "Remisión de deuda" },
  { clave: "26", descripcion: "Prescripción o caducidad" },
  { clave: "27", descripcion: "A satisfacción del acreedor" },
  { clave: "28", descripcion: "Tarjeta de débito" },
  { clave: "29", descripcion: "Tarjeta de servicios" },
  { clave: "30", descripcion: "Aplicación de anticipos" },
  { clave: "31", descripcion: "Intermediario pagos" },
  { clave: "99", descripcion: "Por definir" },
];
```

- [ ] **Step 2: Create regimen fiscal SAT**

```typescript
// packages/shared/src/catalogs/regimen-fiscal.ts

export interface RegimenFiscalSat {
  clave: string;
  descripcion: string;
  personaFisica: boolean;
  personaMoral: boolean;
}

export const REGIMEN_FISCAL_SAT: RegimenFiscalSat[] = [
  { clave: "601", descripcion: "General de Ley Personas Morales", personaFisica: false, personaMoral: true },
  { clave: "603", descripcion: "Personas Morales con Fines no Lucrativos", personaFisica: false, personaMoral: true },
  { clave: "605", descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios", personaFisica: true, personaMoral: false },
  { clave: "606", descripcion: "Arrendamiento", personaFisica: true, personaMoral: false },
  { clave: "607", descripcion: "Régimen de Enajenación o Adquisición de Bienes", personaFisica: true, personaMoral: false },
  { clave: "608", descripcion: "Demás ingresos", personaFisica: true, personaMoral: false },
  { clave: "610", descripcion: "Residentes en el Extranjero sin Establecimiento Permanente en México", personaFisica: true, personaMoral: true },
  { clave: "611", descripcion: "Ingresos por Dividendos (socios y accionistas)", personaFisica: true, personaMoral: false },
  { clave: "612", descripcion: "Personas Físicas con Actividades Empresariales y Profesionales", personaFisica: true, personaMoral: false },
  { clave: "614", descripcion: "Ingresos por intereses", personaFisica: true, personaMoral: false },
  { clave: "615", descripcion: "Régimen de los ingresos por obtención de premios", personaFisica: true, personaMoral: false },
  { clave: "616", descripcion: "Sin obligaciones fiscales", personaFisica: true, personaMoral: false },
  { clave: "620", descripcion: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", personaFisica: false, personaMoral: true },
  { clave: "621", descripcion: "Incorporación Fiscal", personaFisica: true, personaMoral: false },
  { clave: "622", descripcion: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", personaFisica: true, personaMoral: true },
  { clave: "623", descripcion: "Opcional para Grupos de Sociedades", personaFisica: false, personaMoral: true },
  { clave: "624", descripcion: "Coordinados", personaFisica: false, personaMoral: true },
  { clave: "625", descripcion: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", personaFisica: true, personaMoral: false },
  { clave: "626", descripcion: "Régimen Simplificado de Confianza", personaFisica: true, personaMoral: true },
];
```

- [ ] **Step 3: Create uso CFDI SAT**

```typescript
// packages/shared/src/catalogs/uso-cfdi.ts

export interface UsoCfdiSat {
  clave: string;
  descripcion: string;
  personaFisica: boolean;
  personaMoral: boolean;
}

export const USO_CFDI_SAT: UsoCfdiSat[] = [
  { clave: "G01", descripcion: "Adquisición de mercancías", personaFisica: true, personaMoral: true },
  { clave: "G02", descripcion: "Devoluciones, descuentos o bonificaciones", personaFisica: true, personaMoral: true },
  { clave: "G03", descripcion: "Gastos en general", personaFisica: true, personaMoral: true },
  { clave: "I01", descripcion: "Construcciones", personaFisica: true, personaMoral: true },
  { clave: "I02", descripcion: "Mobiliario y equipo de oficina por inversiones", personaFisica: true, personaMoral: true },
  { clave: "I03", descripcion: "Equipo de transporte", personaFisica: true, personaMoral: true },
  { clave: "I04", descripcion: "Equipo de cómputo y accesorios", personaFisica: true, personaMoral: true },
  { clave: "I05", descripcion: "Dados, troqueles, moldes, matrices y herramental", personaFisica: true, personaMoral: true },
  { clave: "I06", descripcion: "Comunicaciones telefónicas", personaFisica: true, personaMoral: true },
  { clave: "I07", descripcion: "Comunicaciones satelitales", personaFisica: true, personaMoral: true },
  { clave: "I08", descripcion: "Otra maquinaria y equipo", personaFisica: true, personaMoral: true },
  { clave: "D01", descripcion: "Honorarios médicos, dentales y gastos hospitalarios", personaFisica: true, personaMoral: false },
  { clave: "D02", descripcion: "Gastos médicos por incapacidad o discapacidad", personaFisica: true, personaMoral: false },
  { clave: "D03", descripcion: "Gastos funerales", personaFisica: true, personaMoral: false },
  { clave: "D04", descripcion: "Donativos", personaFisica: true, personaMoral: false },
  { clave: "D05", descripcion: "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)", personaFisica: true, personaMoral: false },
  { clave: "D06", descripcion: "Aportaciones voluntarias al SAR", personaFisica: true, personaMoral: false },
  { clave: "D07", descripcion: "Primas por seguros de gastos médicos", personaFisica: true, personaMoral: false },
  { clave: "D08", descripcion: "Gastos de transportación escolar obligatoria", personaFisica: true, personaMoral: false },
  { clave: "D09", descripcion: "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones", personaFisica: true, personaMoral: false },
  { clave: "D10", descripcion: "Pagos por servicios educativos (colegiaturas)", personaFisica: true, personaMoral: false },
  { clave: "S01", descripcion: "Sin efectos fiscales", personaFisica: true, personaMoral: true },
  { clave: "CP01", descripcion: "Pagos", personaFisica: true, personaMoral: true },
  { clave: "CN01", descripcion: "Nómina", personaFisica: true, personaMoral: false },
];
```

- [ ] **Step 4: Create metodo de pago SAT**

```typescript
// packages/shared/src/catalogs/metodo-pago.ts

export interface MetodoPagoSat {
  clave: string;
  descripcion: string;
}

export const METODO_PAGO_SAT: MetodoPagoSat[] = [
  { clave: "PUE", descripcion: "Pago en una sola exhibición" },
  { clave: "PPD", descripcion: "Pago en parcialidades o diferido" },
];
```

- [ ] **Step 5: Create moneda SAT**

```typescript
// packages/shared/src/catalogs/moneda.ts

export interface MonedaSat {
  clave: string;
  descripcion: string;
}

export const MONEDA_SAT: MonedaSat[] = [
  { clave: "MXN", descripcion: "Peso Mexicano" },
  { clave: "USD", descripcion: "Dólar americano" },
  { clave: "EUR", descripcion: "Euro" },
];
```

- [ ] **Step 6: Create tipo comprobante SAT**

```typescript
// packages/shared/src/catalogs/tipo-comprobante.ts

export interface TipoComprobanteSat {
  clave: string;
  descripcion: string;
}

export const TIPO_COMPROBANTE_SAT: TipoComprobanteSat[] = [
  { clave: "I", descripcion: "Ingreso" },
  { clave: "E", descripcion: "Egreso" },
  { clave: "T", descripcion: "Traslado" },
  { clave: "N", descripcion: "Nómina" },
  { clave: "P", descripcion: "Pago" },
];
```

- [ ] **Step 7: Create catalogs barrel export**

```typescript
// packages/shared/src/catalogs/index.ts

export * from "./formas-pago.js";
export * from "./regimen-fiscal.js";
export * from "./uso-cfdi.js";
export * from "./metodo-pago.js";
export * from "./moneda.js";
export * from "./tipo-comprobante.js";
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/catalogs/
git commit -m "feat: add SAT catalogs - formas pago, regimen fiscal, uso CFDI, metodo pago, moneda, tipo comprobante"
```

---

### Task 13: Write Schema Validation Tests

**Files:**
- Create: `packages/shared/tests/schemas.test.ts`

- [ ] **Step 1: Write schema tests**

```typescript
// packages/shared/tests/schemas.test.ts

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

    // Create all tables from schema using raw SQL
    // This tests that schemas produce valid SQL
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd packages/shared && pnpm test`
Expected: All 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/shared/tests/schemas.test.ts
git commit -m "test: add schema validation tests with in-memory SQLite"
```

---

### Task 14: Write Catalog Completeness Tests

**Files:**
- Create: `packages/shared/tests/catalogs.test.ts`

- [ ] **Step 1: Write catalog tests**

```typescript
// packages/shared/tests/catalogs.test.ts

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
    expect(claves).toContain("01"); // Efectivo
    expect(claves).toContain("04"); // Tarjeta de crédito
    expect(claves).toContain("28"); // Tarjeta de débito
    expect(claves).toContain("03"); // Transferencia
    expect(claves).toContain("08"); // Vales de despensa
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
```

- [ ] **Step 2: Run tests**

Run: `cd packages/shared && pnpm test`
Expected: All schema and catalog tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/shared/tests/catalogs.test.ts
git commit -m "test: add SAT catalog completeness tests"
```

---

### Task 15: Create Server App Skeleton with PostgreSQL Connection

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/drizzle.config.ts`
- Create: `apps/server/src/db/index.ts`
- Create: `apps/server/src/db/migrate.ts`
- Create: `apps/server/src/db/seed.ts`

- [ ] **Step 1: Create apps/server/package.json**

```json
{
  "name": "@posgl/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:seed": "tsx src/db/seed.ts",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@posgl/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "drizzle-kit": "^0.30.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create apps/server/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create apps/server/drizzle.config.ts**

```typescript
// apps/server/drizzle.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "../../packages/shared/src/schemas/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/posgl",
  },
});
```

- [ ] **Step 4: Create apps/server/src/db/index.ts**

```typescript
// apps/server/src/db/index.ts

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@posgl/shared/schemas";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/posgl";

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { schema };
```

- [ ] **Step 5: Create apps/server/src/db/migrate.ts**

```typescript
// apps/server/src/db/migrate.ts

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/posgl";

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 6: Create apps/server/src/db/seed.ts**

```typescript
// apps/server/src/db/seed.ts

import { db, schema } from "./index.js";

async function seed() {
  console.log("Seeding database...");

  // Create default sucursal
  const [sucursal] = await db
    .insert(schema.sucursales)
    .values({
      nombre: "Sucursal Principal",
      direccion: "Dirección del negocio",
    })
    .returning();

  console.log(`Created sucursal: ${sucursal.nombre} (id: ${sucursal.id})`);

  // Create default terminal
  const [terminal] = await db
    .insert(schema.terminales)
    .values({
      nombre: "Caja 1",
      sucursalId: sucursal.id,
    })
    .returning();

  console.log(`Created terminal: ${terminal.nombre} (id: ${terminal.id})`);

  // Create admin user (password: admin123 - change in production)
  const [admin] = await db
    .insert(schema.usuarios)
    .values({
      nombre: "Administrador",
      username: "admin",
      passwordHash: "$2b$10$placeholder_hash_change_on_first_login",
      rol: "admin",
      sucursalId: sucursal.id,
    })
    .returning();

  console.log(`Created admin user: ${admin.username} (id: ${admin.id})`);

  // Create sample categories
  const [catBebidas] = await db
    .insert(schema.categorias)
    .values({ nombre: "Bebidas" })
    .returning();

  const [catAlimentos] = await db
    .insert(schema.categorias)
    .values({ nombre: "Alimentos" })
    .returning();

  const [catLimpieza] = await db
    .insert(schema.categorias)
    .values({ nombre: "Limpieza" })
    .returning();

  console.log("Created categories: Bebidas, Alimentos, Limpieza");

  // Create sample products
  const productosData = [
    {
      nombre: "Coca-Cola 600ml",
      sku: "CC600",
      codigoBarras: "7501055300120",
      precioVenta: 18.5,
      costo: 12.0,
      categoriaId: catBebidas.id,
      claveSat: "50202301",
      unidadSat: "H87",
    },
    {
      nombre: "Sabritas Original 45g",
      sku: "SAB45",
      codigoBarras: "7501011115309",
      precioVenta: 22.0,
      costo: 15.0,
      categoriaId: catAlimentos.id,
      claveSat: "50181900",
      unidadSat: "H87",
    },
    {
      nombre: "Fabuloso Lavanda 1L",
      sku: "FAB1L",
      codigoBarras: "7501025403102",
      precioVenta: 35.0,
      costo: 22.0,
      categoriaId: catLimpieza.id,
      claveSat: "47131700",
      unidadSat: "H87",
    },
  ];

  for (const prod of productosData) {
    const [producto] = await db
      .insert(schema.productos)
      .values(prod)
      .returning();

    // Set initial stock
    await db.insert(schema.stockSucursal).values({
      productoId: producto.id,
      sucursalId: sucursal.id,
      cantidad: 100,
    });

    console.log(`Created product: ${producto.nombre} (stock: 100)`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/
git commit -m "feat: create server app skeleton with PostgreSQL connection, migrations, and seed"
```

---

### Task 16: Create Desktop App Skeleton with SQLite Connection

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/drizzle.config.ts`
- Create: `apps/desktop/src/db/index.ts`
- Create: `apps/desktop/src/db/migrate.ts`

- [ ] **Step 1: Create apps/desktop/package.json**

```json
{
  "name": "@posgl/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "echo 'Electron dev - configured in Phase 3'",
    "build": "tsc",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@posgl/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "better-sqlite3": "^11.8.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "drizzle-kit": "^0.30.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create apps/desktop/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create apps/desktop/drizzle.config.ts**

```typescript
// apps/desktop/drizzle.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "../../packages/shared/src/schemas/*.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./posgl.db",
  },
});
```

- [ ] **Step 4: Create apps/desktop/src/db/index.ts**

```typescript
// apps/desktop/src/db/index.ts

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@posgl/shared/schemas";
import { join } from "path";

const dbPath = process.env.POSGL_DB_PATH || join(process.cwd(), "posgl.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
export { sqlite };
```

- [ ] **Step 5: Create apps/desktop/src/db/migrate.ts**

```typescript
// apps/desktop/src/db/migrate.ts

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const dbPath = process.env.POSGL_DB_PATH || "./posgl.db";

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

console.log("Running SQLite migrations...");
migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations complete.");

sqlite.close();
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/
git commit -m "feat: create desktop app skeleton with SQLite connection and migrations"
```

---

### Task 17: Create Web App Skeleton

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@posgl/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "echo 'Next.js dev - configured in Phase 11'",
    "build": "echo 'Next.js build - configured in Phase 11'",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "@posgl/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/
git commit -m "feat: create web app skeleton (placeholder for Phase 11)"
```

---

### Task 18: Install All Dependencies and Verify Build

- [ ] **Step 1: Install all workspace dependencies**

Run: `pnpm install`
Expected: All packages resolved, lockfile updated

- [ ] **Step 2: Build shared package**

Run: `cd packages/shared && pnpm build`
Expected: TypeScript compiles successfully, `dist/` folder created with .js and .d.ts files

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests in @posgl/shared pass

- [ ] **Step 4: Verify monorepo structure**

Run: `pnpm ls -r`
Expected: Shows @posgl/shared, @posgl/server, @posgl/desktop, @posgl/web as workspace packages

- [ ] **Step 5: Commit lockfile and any updates**

```bash
git add pnpm-lock.yaml
git commit -m "chore: install dependencies and verify monorepo build"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Initialize monorepo root | 5 root config files |
| 2 | Create @posgl/shared skeleton | 3 files |
| 3 | Shared column helpers and enums | 3 files |
| 4 | Core schemas (sucursal, terminal, usuario, categoria) | 4 files |
| 5 | Product and stock schemas | 2 files |
| 6 | Cliente and proveedor schemas | 2 files |
| 7 | Venta, detalle, pago schemas | 2 files |
| 8 | Factura schema | 1 file |
| 9 | CorteCaja and movimiento schemas | 1 file |
| 10 | Remaining schemas (6 files) | 6 files |
| 11 | Schema barrel export | 1 file |
| 12 | SAT catalogs | 7 files |
| 13 | Schema validation tests | 1 file |
| 14 | Catalog completeness tests | 1 file |
| 15 | Server app skeleton | 6 files |
| 16 | Desktop app skeleton | 5 files |
| 17 | Web app skeleton | 2 files |
| 18 | Install and verify | lockfile |
