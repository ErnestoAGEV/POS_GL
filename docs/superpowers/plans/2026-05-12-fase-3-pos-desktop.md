# Fase 3: POS Desktop - Electron + React - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Electron desktop POS application with React UI, featuring the main sales screen (product search, cart, totals, checkout), keyboard shortcuts, and the dark mode design system.

**Architecture:** Electron with Vite for bundling. Main process handles window creation and SQLite DB. Renderer process runs React app with Zustand for state. IPC bridge connects renderer to main process for DB operations.

**Tech Stack:** Electron 33+, React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Lucide React icons

---

## File Structure

```
apps/desktop/
  package.json                      # Updated with Electron + React deps
  electron.vite.config.ts           # Vite config for Electron
  tsconfig.json                     # Updated
  tsconfig.node.json                # Node (main process) TS config
  tsconfig.web.json                 # Web (renderer) TS config
  tailwind.config.ts                # Tailwind config with design system colors
  src/
    main/
      index.ts                      # Electron main process
      ipc-handlers.ts               # IPC handlers for DB operations
    preload/
      index.ts                      # Preload script (context bridge)
    renderer/
      index.html                    # HTML entry point
      main.tsx                      # React entry point
      App.tsx                       # Root component with router
      styles/
        globals.css                 # Tailwind imports + custom styles
      stores/
        cart-store.ts               # Zustand cart state
        auth-store.ts               # Zustand auth state
        app-store.ts                # Zustand app state (sucursal, terminal)
      components/
        layout/
          Sidebar.tsx               # Navigation sidebar
          Navbar.tsx                # Top navbar (sucursal, terminal, user, clock)
          HotkeyBar.tsx             # Bottom F-key bar
        pos/
          ProductSearch.tsx          # Search bar with barcode/name input
          CartTable.tsx             # Cart items table
          CartSummary.tsx           # Subtotal, discount, IVA, total, pay button
          PaymentModal.tsx          # Payment modal (mixed payment)
        ui/
          Button.tsx                # Reusable button component
          Input.tsx                 # Reusable input component
          Modal.tsx                 # Reusable modal component
      hooks/
        useHotkeys.ts              # Keyboard shortcut hook
      lib/
        api.ts                     # IPC API wrapper
        format.ts                  # Currency/date formatting utils
      pages/
        LoginPage.tsx              # Login screen
        PosPage.tsx                # Main POS page (assembles POS components)
```

---

### Task 1: Setup Electron + Vite + React Project

**Files:**
- Modify: `apps/desktop/package.json`
- Create: `apps/desktop/electron.vite.config.ts`
- Create: `apps/desktop/tsconfig.node.json`
- Create: `apps/desktop/tsconfig.web.json`
- Modify: `apps/desktop/tsconfig.json`

- [ ] **Step 1: Update package.json with all dependencies**

Replace the entire apps/desktop/package.json with:

```json
{
  "name": "@posgl/desktop",
  "version": "0.1.0",
  "private": true,
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts",
    "clean": "rm -rf out dist"
  },
  "dependencies": {
    "@posgl/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "better-sqlite3": "^11.8.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.511.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "drizzle-kit": "^0.30.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "electron": "^35.0.0",
    "electron-vite": "^3.1.0",
    "vite": "^6.3.0",
    "@vitejs/plugin-react": "^4.5.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Create electron.vite.config.ts**

```typescript
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    root: resolve(__dirname, "src/renderer"),
    build: {
      outDir: resolve(__dirname, "out/renderer"),
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
      },
    },
  },
});
```

- [ ] **Step 3: Create tsconfig.node.json**

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
    "outDir": "./out",
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/main/**/*", "src/preload/**/*", "electron.vite.config.ts"]
}
```

- [ ] **Step 4: Create tsconfig.web.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "outDir": "./out",
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/renderer/**/*"]
}
```

- [ ] **Step 5: Update tsconfig.json as project references root**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install` from root

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/
git commit -m "feat(desktop): setup Electron + Vite + React + Tailwind project structure"
```

---

### Task 2: Create Electron Main Process and Preload

**Files:**
- Move: `apps/desktop/src/db/index.ts` (keep as is)
- Create: `apps/desktop/src/main/index.ts`
- Create: `apps/desktop/src/main/ipc-handlers.ts`
- Create: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Create main process**

```typescript
// apps/desktop/src/main/index.ts

import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { registerIpcHandlers } from "./ipc-handlers.js";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "POSGL - Punto de Venta",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers(ipcMain);
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
```

- [ ] **Step 2: Create IPC handlers**

```typescript
// apps/desktop/src/main/ipc-handlers.ts

import { IpcMain } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, like, or, sql } from "drizzle-orm";
import * as schema from "@posgl/shared/schemas";
import { join } from "path";
import { app } from "electron";

const dbPath = join(app.getPath("userData"), "posgl.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

export function registerIpcHandlers(ipcMain: IpcMain) {
  // Products - search
  ipcMain.handle("products:search", async (_event, query: string) => {
    if (!query || query.trim().length === 0) {
      return db.select().from(schema.productos)
        .where(eq(schema.productos.activo, true))
        .limit(20)
        .all();
    }
    return db.select().from(schema.productos)
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

  // Products - get by barcode (exact match)
  ipcMain.handle("products:barcode", async (_event, code: string) => {
    return db.select().from(schema.productos)
      .where(eq(schema.productos.codigoBarras, code))
      .limit(1)
      .all()
      .then(rows => rows[0] || null);
  });

  // Categories - list
  ipcMain.handle("categories:list", async () => {
    return db.select().from(schema.categorias)
      .where(eq(schema.categorias.activa, true))
      .all();
  });

  // Stock - get for product at sucursal
  ipcMain.handle("stock:get", async (_event, productoId: number, sucursalId: number) => {
    return db.select().from(schema.stockSucursal)
      .where(
        sql`${schema.stockSucursal.productoId} = ${productoId} AND ${schema.stockSucursal.sucursalId} = ${sucursalId}`
      )
      .all()
      .then(rows => rows[0] || null);
  });
}
```

- [ ] **Step 3: Create preload script**

```typescript
// apps/desktop/src/preload/index.ts

import { contextBridge, ipcRenderer } from "electron";

const api = {
  products: {
    search: (query: string) => ipcRenderer.invoke("products:search", query),
    getByBarcode: (code: string) => ipcRenderer.invoke("products:barcode", code),
  },
  categories: {
    list: () => ipcRenderer.invoke("categories:list"),
  },
  stock: {
    get: (productoId: number, sucursalId: number) =>
      ipcRenderer.invoke("stock:get", productoId, sucursalId),
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronAPI = typeof api;
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/main/ apps/desktop/src/preload/
git commit -m "feat(desktop): add Electron main process with IPC handlers and preload"
```

---

### Task 3: Create Renderer Entry Point and Tailwind Setup

**Files:**
- Create: `apps/desktop/src/renderer/index.html`
- Create: `apps/desktop/src/renderer/main.tsx`
- Create: `apps/desktop/src/renderer/App.tsx`
- Create: `apps/desktop/src/renderer/styles/globals.css`
- Create: `apps/desktop/src/renderer/env.d.ts`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>POSGL - Punto de Venta</title>
</head>
<body class="bg-slate-950 text-slate-50 overflow-hidden">
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create globals.css**

```css
/* apps/desktop/src/renderer/styles/globals.css */

@import "tailwindcss";

@theme {
  --color-pos-bg: #020617;
  --color-pos-card: #0F172A;
  --color-pos-active: #1E293B;
  --color-pos-text: #F8FAFC;
  --color-pos-muted: #94A3B8;
  --color-pos-green: #22C55E;
  --color-pos-red: #EF4444;
  --color-pos-blue: #3B82F6;
  --color-pos-amber: #F59E0B;

  --font-family-heading: "Rubik", sans-serif;
  --font-family-body: "Nunito Sans", sans-serif;
}

@font-face {
  font-family: "Rubik";
  src: url("https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap");
}

@font-face {
  font-family: "Nunito Sans";
  src: url("https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&display=swap");
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Nunito Sans", sans-serif;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: "Rubik", sans-serif;
}

/* Scrollbar styling for dark mode */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #0F172A;
}
::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
```

- [ ] **Step 3: Create env.d.ts for API types**

```typescript
// apps/desktop/src/renderer/env.d.ts

import type { ElectronAPI } from "../preload/index";

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
```

- [ ] **Step 4: Create main.tsx**

```tsx
// apps/desktop/src/renderer/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Create App.tsx (simple for now)**

```tsx
// apps/desktop/src/renderer/App.tsx

import { useState } from "react";
import { useAuthStore } from "./stores/auth-store";
import { LoginPage } from "./pages/LoginPage";
import { PosPage } from "./pages/PosPage";

export function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return <PosPage />;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/renderer/
git commit -m "feat(desktop): add renderer entry point with Tailwind CSS design system"
```

---

### Task 4: Create Zustand Stores

**Files:**
- Create: `apps/desktop/src/renderer/stores/auth-store.ts`
- Create: `apps/desktop/src/renderer/stores/cart-store.ts`
- Create: `apps/desktop/src/renderer/stores/app-store.ts`

- [ ] **Step 1: Create auth store**

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
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false }),
}));
```

- [ ] **Step 2: Create cart store**

```typescript
// apps/desktop/src/renderer/stores/cart-store.ts

import { create } from "zustand";

export interface CartItem {
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  descuento: number;
  tasaIva: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  descuentoGlobal: number;
  addItem: (product: {
    id: number;
    nombre: string;
    precioVenta: number;
    tasaIva: number;
  }) => void;
  removeItem: (productoId: number) => void;
  updateQuantity: (productoId: number, cantidad: number) => void;
  updateItemDiscount: (productoId: number, descuento: number) => void;
  setGlobalDiscount: (descuento: number) => void;
  clear: () => void;
  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getIva: () => number;
  getTotal: () => number;
}

function calcSubtotal(precio: number, cantidad: number, descuento: number): number {
  return (precio * cantidad) - descuento;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  descuentoGlobal: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.productoId === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productoId === product.id
              ? {
                  ...i,
                  cantidad: i.cantidad + 1,
                  subtotal: calcSubtotal(i.precioUnitario, i.cantidad + 1, i.descuento),
                }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            productoId: product.id,
            nombre: product.nombre,
            precioUnitario: product.precioVenta,
            cantidad: 1,
            descuento: 0,
            tasaIva: product.tasaIva,
            subtotal: product.precioVenta,
          },
        ],
      };
    });
  },

  removeItem: (productoId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productoId !== productoId),
    }));
  },

  updateQuantity: (productoId, cantidad) => {
    if (cantidad <= 0) {
      get().removeItem(productoId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId
          ? { ...i, cantidad, subtotal: calcSubtotal(i.precioUnitario, cantidad, i.descuento) }
          : i
      ),
    }));
  },

  updateItemDiscount: (productoId, descuento) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId
          ? { ...i, descuento, subtotal: calcSubtotal(i.precioUnitario, i.cantidad, descuento) }
          : i
      ),
    }));
  },

  setGlobalDiscount: (descuento) => set({ descuentoGlobal: descuento }),

  clear: () => set({ items: [], descuentoGlobal: 0 }),

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.subtotal, 0);
  },

  getDiscountTotal: () => {
    const itemDiscounts = get().items.reduce((sum, i) => sum + i.descuento, 0);
    return itemDiscounts + get().descuentoGlobal;
  },

  getIva: () => {
    return get().items.reduce((sum, i) => {
      const baseAfterDiscount = i.subtotal;
      return sum + baseAfterDiscount * i.tasaIva;
    }, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const iva = get().getIva();
    const globalDiscount = get().descuentoGlobal;
    return subtotal + iva - globalDiscount;
  },
}));
```

- [ ] **Step 3: Create app store**

```typescript
// apps/desktop/src/renderer/stores/app-store.ts

import { create } from "zustand";

interface AppState {
  sucursalId: number;
  sucursalNombre: string;
  terminalId: number;
  terminalNombre: string;
  setSucursal: (id: number, nombre: string) => void;
  setTerminal: (id: number, nombre: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sucursalId: 1,
  sucursalNombre: "Sucursal Principal",
  terminalId: 1,
  terminalNombre: "Caja 1",
  setSucursal: (id, nombre) => set({ sucursalId: id, sucursalNombre: nombre }),
  setTerminal: (id, nombre) => set({ terminalId: id, terminalNombre: nombre }),
}));
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/stores/
git commit -m "feat(desktop): add Zustand stores - auth, cart, app state"
```

---

### Task 5: Create Utility Functions and Hooks

**Files:**
- Create: `apps/desktop/src/renderer/lib/format.ts`
- Create: `apps/desktop/src/renderer/hooks/useHotkeys.ts`

- [ ] **Step 1: Create format utilities**

```typescript
// apps/desktop/src/renderer/lib/format.ts

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}
```

- [ ] **Step 2: Create hotkeys hook**

```typescript
// apps/desktop/src/renderer/hooks/useHotkeys.ts

import { useEffect } from "react";

type HotkeyMap = Record<string, () => void>;

export function useHotkeys(hotkeys: HotkeyMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const key = e.key;
      if (hotkeys[key]) {
        e.preventDefault();
        hotkeys[key]();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hotkeys]);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/lib/ apps/desktop/src/renderer/hooks/
git commit -m "feat(desktop): add format utils and hotkeys hook"
```

---

### Task 6: Create Reusable UI Components

**Files:**
- Create: `apps/desktop/src/renderer/components/ui/Button.tsx`
- Create: `apps/desktop/src/renderer/components/ui/Input.tsx`
- Create: `apps/desktop/src/renderer/components/ui/Modal.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// apps/desktop/src/renderer/components/ui/Button.tsx

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-pos-green hover:bg-green-600 text-white",
  danger: "bg-pos-red hover:bg-red-600 text-white",
  secondary: "bg-pos-blue hover:bg-blue-600 text-white",
  ghost: "bg-transparent hover:bg-pos-active text-pos-muted hover:text-pos-text",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-semibold
        transition-colors duration-150
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-pos-blue focus:ring-offset-2 focus:ring-offset-pos-bg
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create Input component**

```tsx
// apps/desktop/src/renderer/components/ui/Input.tsx

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm text-pos-muted font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            bg-pos-card border border-slate-700
            text-pos-text placeholder:text-slate-500
            px-4 py-2.5 rounded-lg text-base
            focus:outline-none focus:ring-2 focus:ring-pos-blue focus:border-transparent
            transition-colors duration-150
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);
```

- [ ] **Step 3: Create Modal component**

```tsx
// apps/desktop/src/renderer/components/ui/Modal.tsx

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export function Modal({ isOpen, onClose, title, children, width = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative bg-pos-card rounded-xl border border-slate-700 shadow-2xl ${width} w-full mx-4`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold font-heading text-pos-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-pos-muted hover:text-pos-text transition-colors cursor-pointer p-1 rounded-lg hover:bg-pos-active"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/ui/
git commit -m "feat(desktop): add reusable UI components - Button, Input, Modal"
```

---

### Task 7: Create Layout Components

**Files:**
- Create: `apps/desktop/src/renderer/components/layout/Navbar.tsx`
- Create: `apps/desktop/src/renderer/components/layout/Sidebar.tsx`
- Create: `apps/desktop/src/renderer/components/layout/HotkeyBar.tsx`

- [ ] **Step 1: Create Navbar**

```tsx
// apps/desktop/src/renderer/components/layout/Navbar.tsx

import { useState, useEffect } from "react";
import { Store, Monitor, User, Clock } from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";
import { formatTime } from "../../lib/format";

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const sucursalNombre = useAppStore((s) => s.sucursalNombre);
  const terminalNombre = useAppStore((s) => s.terminalNombre);
  const [time, setTime] = useState(formatTime());

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-pos-card border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold font-heading text-pos-green">POSGL</h1>
      </div>

      <div className="flex items-center gap-6 text-sm text-pos-muted">
        <div className="flex items-center gap-2">
          <Store size={16} />
          <span>{sucursalNombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <Monitor size={16} />
          <span>{terminalNombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <User size={16} />
          <span className="text-pos-text">{user?.nombre || "Sin usuario"}</span>
          <span className="text-xs bg-pos-active px-2 py-0.5 rounded">{user?.rol}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span className="tabular-nums">{time}</span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create Sidebar**

```tsx
// apps/desktop/src/renderer/components/layout/Sidebar.tsx

import {
  ShoppingCart,
  Package,
  Users,
  FileText,
  Scissors,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  id: string;
}

const items: SidebarItem[] = [
  { icon: <ShoppingCart size={20} />, label: "Caja", id: "pos" },
  { icon: <Package size={20} />, label: "Inventario", id: "inventory" },
  { icon: <Users size={20} />, label: "Clientes", id: "clients" },
  { icon: <FileText size={20} />, label: "Facturas", id: "invoices" },
  { icon: <Scissors size={20} />, label: "Cortes", id: "cashcuts" },
  { icon: <BarChart3 size={20} />, label: "Reportes", id: "reports" },
  { icon: <Settings size={20} />, label: "Config", id: "settings" },
];

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-20 bg-pos-card border-r border-slate-700 flex flex-col items-center py-4 gap-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`
            w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer
            transition-colors duration-150
            ${
              active === item.id
                ? "bg-pos-active text-pos-green"
                : "text-pos-muted hover:text-pos-text hover:bg-pos-active"
            }
          `}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={logout}
        className="w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer text-pos-muted hover:text-pos-red hover:bg-pos-active transition-colors duration-150"
      >
        <LogOut size={20} />
        <span className="text-[10px] font-medium">Salir</span>
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Create HotkeyBar**

```tsx
// apps/desktop/src/renderer/components/layout/HotkeyBar.tsx

const hotkeys = [
  { key: "F1", label: "Buscar" },
  { key: "F2", label: "Cliente" },
  { key: "F3", label: "Cantidad" },
  { key: "F4", label: "Precio" },
  { key: "F5", label: "Espera" },
  { key: "F6", label: "Recuperar" },
  { key: "F7", label: "Reimprimir" },
  { key: "F8", label: "Descuento" },
  { key: "F9", label: "Devolver" },
  { key: "F10", label: "Apartado" },
  { key: "F11", label: "Cotizar" },
  { key: "F12", label: "Cobrar" },
];

export function HotkeyBar() {
  return (
    <footer className="h-10 bg-pos-card border-t border-slate-700 flex items-center px-2 gap-1">
      {hotkeys.map((hk) => (
        <div
          key={hk.key}
          className="flex items-center gap-1 px-2 py-1 text-xs text-pos-muted"
        >
          <kbd className="bg-pos-active px-1.5 py-0.5 rounded text-pos-text font-mono text-[10px]">
            {hk.key}
          </kbd>
          <span>{hk.label}</span>
        </div>
      ))}
    </footer>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/layout/
git commit -m "feat(desktop): add layout components - Navbar, Sidebar, HotkeyBar"
```

---

### Task 8: Create POS Components

**Files:**
- Create: `apps/desktop/src/renderer/components/pos/ProductSearch.tsx`
- Create: `apps/desktop/src/renderer/components/pos/CartTable.tsx`
- Create: `apps/desktop/src/renderer/components/pos/CartSummary.tsx`
- Create: `apps/desktop/src/renderer/components/pos/PaymentModal.tsx`

- [ ] **Step 1: Create ProductSearch**

```tsx
// apps/desktop/src/renderer/components/pos/ProductSearch.tsx

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useCartStore } from "../../stores/cart-store";

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Check if barcode (enter pressed or numeric-only input)
    const products = await window.api.products.search(value);
    setResults(products);
    setShowResults(products.length > 0);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      // Try exact barcode match first
      const product = await window.api.products.getByBarcode(query.trim());
      if (product) {
        addItem(product);
        setQuery("");
        setResults([]);
        setShowResults(false);
        return;
      }
      // If results exist, add first one
      if (results.length > 0) {
        addItem(results[0]);
        setQuery("");
        setResults([]);
        setShowResults(false);
      }
    }
    if (e.key === "Escape") {
      setQuery("");
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelect = (product: any) => {
    addItem(product);
    setQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Escanear código de barras o buscar producto..."
          className="w-full bg-pos-card border border-slate-700 text-pos-text placeholder:text-slate-500 pl-10 pr-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-pos-blue focus:border-transparent transition-colors duration-150"
        />
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-pos-card border border-slate-700 rounded-xl shadow-2xl z-40 max-h-64 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-pos-active transition-colors cursor-pointer border-b border-slate-800 last:border-0"
            >
              <div className="text-left">
                <div className="text-pos-text font-medium">{product.nombre}</div>
                <div className="text-pos-muted text-xs">
                  {product.sku && <span>SKU: {product.sku}</span>}
                  {product.codigoBarras && <span className="ml-3">CB: {product.codigoBarras}</span>}
                </div>
              </div>
              <div className="text-pos-green font-bold font-heading">
                ${product.precioVenta.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CartTable**

```tsx
// apps/desktop/src/renderer/components/pos/CartTable.tsx

import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "../../stores/cart-store";
import { formatCurrency } from "../../lib/format";

export function CartTable() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-pos-muted">
        <div className="text-center">
          <p className="text-lg">Carrito vacío</p>
          <p className="text-sm mt-1">Escanea un producto o búscalo por nombre</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-pos-card border-b border-slate-700">
          <tr className="text-pos-muted text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4">Producto</th>
            <th className="text-center py-3 px-2 w-32">Cantidad</th>
            <th className="text-right py-3 px-4 w-28">Precio</th>
            <th className="text-right py-3 px-4 w-28">Subtotal</th>
            <th className="py-3 px-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.productoId}
              className="border-b border-slate-800 hover:bg-pos-active/50 transition-colors"
            >
              <td className="py-3 px-4">
                <span className="text-pos-text font-medium">{item.nombre}</span>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productoId, item.cantidad - 1)}
                    className="w-7 h-7 rounded-lg bg-pos-active hover:bg-slate-600 flex items-center justify-center text-pos-muted hover:text-pos-text cursor-pointer transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-pos-text font-medium w-8 text-center tabular-nums">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productoId, item.cantidad + 1)}
                    className="w-7 h-7 rounded-lg bg-pos-active hover:bg-slate-600 flex items-center justify-center text-pos-muted hover:text-pos-text cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-pos-muted tabular-nums">
                {formatCurrency(item.precioUnitario)}
              </td>
              <td className="py-3 px-4 text-right text-pos-text font-medium tabular-nums">
                {formatCurrency(item.subtotal)}
              </td>
              <td className="py-3 px-2">
                <button
                  onClick={() => removeItem(item.productoId)}
                  className="text-pos-muted hover:text-pos-red cursor-pointer transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create CartSummary**

```tsx
// apps/desktop/src/renderer/components/pos/CartSummary.tsx

import { useCartStore } from "../../stores/cart-store";
import { formatCurrency } from "../../lib/format";
import { Button } from "../ui/Button";

interface CartSummaryProps {
  onPay: () => void;
}

export function CartSummary({ onPay }: CartSummaryProps) {
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getDiscountTotal = useCartStore((s) => s.getDiscountTotal);
  const getIva = useCartStore((s) => s.getIva);
  const getTotal = useCartStore((s) => s.getTotal);

  const subtotal = getSubtotal();
  const discount = getDiscountTotal();
  const iva = getIva();
  const total = getTotal();
  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <div className="bg-pos-card border-l border-slate-700 w-72 flex flex-col">
      <div className="p-4 flex-1 flex flex-col justify-end gap-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-pos-muted">
            <span>Artículos</span>
            <span className="tabular-nums">{itemCount}</span>
          </div>
          <div className="flex justify-between text-pos-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-pos-amber">
              <span>Descuento</span>
              <span className="tabular-nums">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-pos-muted">
            <span>IVA</span>
            <span className="tabular-nums">{formatCurrency(iva)}</span>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <div className="flex justify-between items-baseline">
            <span className="text-pos-muted text-sm">TOTAL</span>
            <span className="text-4xl font-bold font-heading text-pos-green tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <Button
          variant="primary"
          size="lg"
          className="w-full text-xl py-4"
          onClick={onPay}
          disabled={items.length === 0}
        >
          COBRAR (F12)
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create PaymentModal**

```tsx
// apps/desktop/src/renderer/components/pos/PaymentModal.tsx

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCartStore } from "../../stores/cart-store";
import { formatCurrency } from "../../lib/format";
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Wallet,
  Gift,
  Receipt,
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const paymentMethods = [
  { id: "efectivo", label: "Efectivo", icon: <Banknote size={20} /> },
  { id: "tarjeta", label: "Tarjeta", icon: <CreditCard size={20} /> },
  { id: "transferencia", label: "Transferencia", icon: <ArrowRightLeft size={20} /> },
  { id: "vale_despensa", label: "Vales", icon: <Receipt size={20} /> },
  { id: "tarjeta_regalo", label: "T. Regalo", icon: <Gift size={20} /> },
];

export function PaymentModal({ isOpen, onClose, onComplete }: PaymentModalProps) {
  const getTotal = useCartStore((s) => s.getTotal);
  const total = getTotal();

  const [selectedMethod, setSelectedMethod] = useState("efectivo");
  const [amountReceived, setAmountReceived] = useState("");

  const received = parseFloat(amountReceived) || 0;
  const change = received - total;

  const handleComplete = () => {
    onComplete();
    setAmountReceived("");
    setSelectedMethod("efectivo");
  };

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cobrar" width="max-w-md">
      <div className="space-y-4">
        <div className="text-center py-2">
          <p className="text-pos-muted text-sm">Total a cobrar</p>
          <p className="text-5xl font-bold font-heading text-pos-green tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="flex gap-2">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 rounded-xl cursor-pointer transition-colors duration-150
                ${
                  selectedMethod === method.id
                    ? "bg-pos-blue text-white"
                    : "bg-pos-active text-pos-muted hover:text-pos-text"
                }
              `}
            >
              {method.icon}
              <span className="text-xs font-medium">{method.label}</span>
            </button>
          ))}
        </div>

        {selectedMethod === "efectivo" && (
          <>
            <Input
              label="Monto recibido"
              type="number"
              step="0.01"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              autoFocus
            />

            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setAmountReceived(amount.toString())}
                  className="px-3 py-1.5 bg-pos-active rounded-lg text-pos-text text-sm hover:bg-slate-600 cursor-pointer transition-colors"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>

            {received > 0 && (
              <div className="text-center py-2 bg-pos-active rounded-xl">
                <p className="text-pos-muted text-sm">Cambio</p>
                <p
                  className={`text-3xl font-bold font-heading tabular-nums ${
                    change >= 0 ? "text-pos-green" : "text-pos-red"
                  }`}
                >
                  {formatCurrency(Math.max(0, change))}
                </p>
              </div>
            )}
          </>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleComplete}
          disabled={selectedMethod === "efectivo" && received < total}
        >
          Completar Venta
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/components/pos/
git commit -m "feat(desktop): add POS components - ProductSearch, CartTable, CartSummary, PaymentModal"
```

---

### Task 9: Create Pages (Login + POS)

**Files:**
- Create: `apps/desktop/src/renderer/pages/LoginPage.tsx`
- Create: `apps/desktop/src/renderer/pages/PosPage.tsx`

- [ ] **Step 1: Create LoginPage**

```tsx
// apps/desktop/src/renderer/pages/LoginPage.tsx

import { useState } from "react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../stores/auth-store";
import { LogIn } from "lucide-react";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // For Phase 3, we do a simple local auth
    // In Phase 4 (sync), this will authenticate against the server
    if (username === "admin" && password === "admin123") {
      login({
        id: 1,
        nombre: "Administrador",
        username: "admin",
        rol: "admin",
        sucursalId: 1,
      });
    } else if (username && password) {
      // Accept any non-empty credentials for demo
      login({
        id: 2,
        nombre: username,
        username,
        rol: "cajero",
        sucursalId: 1,
      });
    } else {
      setError("Ingresa usuario y contraseña");
    }
  };

  return (
    <div className="min-h-screen bg-pos-bg flex items-center justify-center">
      <div className="bg-pos-card rounded-2xl border border-slate-700 shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-pos-green">POSGL</h1>
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
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <p className="text-pos-red text-sm text-center">{error}</p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
            <LogIn size={20} />
            Iniciar Sesión
          </Button>
        </form>

        <p className="text-pos-muted text-xs text-center mt-6">
          v0.1.0 — Fase 3
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PosPage**

```tsx
// apps/desktop/src/renderer/pages/PosPage.tsx

import { useState, useMemo } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Sidebar } from "../components/layout/Sidebar";
import { HotkeyBar } from "../components/layout/HotkeyBar";
import { ProductSearch } from "../components/pos/ProductSearch";
import { CartTable } from "../components/pos/CartTable";
import { CartSummary } from "../components/pos/CartSummary";
import { PaymentModal } from "../components/pos/PaymentModal";
import { useCartStore } from "../stores/cart-store";
import { useHotkeys } from "../hooks/useHotkeys";

export function PosPage() {
  const [activeSection, setActiveSection] = useState("pos");
  const [showPayment, setShowPayment] = useState(false);
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);

  const hotkeys = useMemo(
    () => ({
      F1: () => {
        // Focus search — handled by ProductSearch component
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Escanear"]'
        );
        input?.focus();
      },
      F12: () => {
        if (items.length > 0) setShowPayment(true);
      },
    }),
    [items.length]
  );

  useHotkeys(hotkeys);

  const handlePaymentComplete = () => {
    // TODO: Save sale to DB in Phase 4
    clear();
    setShowPayment(false);
  };

  return (
    <div className="h-screen flex flex-col bg-pos-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar active={activeSection} onNavigate={setActiveSection} />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeSection === "pos" && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col p-4 gap-4">
                <ProductSearch />
                <CartTable />
              </div>
              <CartSummary onPay={() => setShowPayment(true)} />
            </div>
          )}

          {activeSection !== "pos" && (
            <div className="flex-1 flex items-center justify-center text-pos-muted">
              <p className="text-lg">
                Módulo "{activeSection}" — disponible en fases posteriores
              </p>
            </div>
          )}
        </main>
      </div>

      <HotkeyBar />

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onComplete={handlePaymentComplete}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/pages/
git commit -m "feat(desktop): add Login and POS pages"
```

---

### Task 10: Verify Electron App Builds

- [ ] **Step 1: Verify Vite build compiles**

Run: `cd apps/desktop && pnpm build`

If there are TypeScript or build errors, fix them.

- [ ] **Step 2: Commit any fixes**

```bash
git add apps/desktop/
git commit -m "fix(desktop): fix build errors"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Electron + Vite + React setup | package.json, vite config, tsconfigs |
| 2 | Main process + IPC + preload | main/index.ts, ipc-handlers.ts, preload/index.ts |
| 3 | Renderer entry + Tailwind | index.html, main.tsx, App.tsx, globals.css |
| 4 | Zustand stores | auth-store.ts, cart-store.ts, app-store.ts |
| 5 | Utils and hooks | format.ts, useHotkeys.ts |
| 6 | UI components | Button.tsx, Input.tsx, Modal.tsx |
| 7 | Layout components | Navbar.tsx, Sidebar.tsx, HotkeyBar.tsx |
| 8 | POS components | ProductSearch, CartTable, CartSummary, PaymentModal |
| 9 | Pages | LoginPage.tsx, PosPage.tsx |
| 10 | Verify build | Build verification + fixes |
