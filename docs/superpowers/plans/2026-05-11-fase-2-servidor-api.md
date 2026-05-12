# Fase 2: Servidor Central - API REST - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Fastify REST API server with JWT authentication, CRUD endpoints for all core entities (productos, categorias, sucursales, terminales, usuarios, clientes, proveedores), and PostgreSQL migrations.

**Architecture:** Fastify with modular route plugins. Each domain (productos, categorias, etc.) gets its own route file. Authentication via JWT middleware. Drizzle ORM for database operations using shared schemas. Zod for request validation.

**Tech Stack:** Fastify, Drizzle ORM, PostgreSQL, JWT (jsonwebtoken), bcrypt, Zod

---

## File Structure

```
apps/server/
  src/
    index.ts                    # Fastify app entry point
    config.ts                   # Environment config
    db/
      index.ts                  # (exists) PostgreSQL connection
      migrate.ts                # (exists) Migration runner
      seed.ts                   # (exists) Seed data
    plugins/
      auth.ts                   # JWT auth plugin (decorate request with user)
      error-handler.ts          # Centralized error handling
    middleware/
      require-auth.ts           # Auth guard middleware
      require-admin.ts          # Admin-only guard
    routes/
      auth.routes.ts            # POST /login
      sucursales.routes.ts      # CRUD /sucursales
      terminales.routes.ts      # CRUD /terminales
      usuarios.routes.ts        # CRUD /usuarios
      categorias.routes.ts      # CRUD /categorias
      productos.routes.ts       # CRUD /productos (+ stock)
      clientes.routes.ts        # CRUD /clientes
      proveedores.routes.ts     # CRUD /proveedores
    utils/
      pagination.ts             # Shared pagination helper
  .env.example                  # Environment variables template
```

---

### Task 1: Install Server Dependencies and Create Config

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/src/config.ts`
- Create: `apps/server/.env.example`

- [ ] **Step 1: Update apps/server/package.json dependencies**

Add these to the existing package.json:

```json
{
  "dependencies": {
    "@posgl/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "postgres": "^3.4.0",
    "fastify": "^5.3.0",
    "@fastify/cors": "^11.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "drizzle-kit": "^0.30.0",
    "@types/node": "^22.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcrypt": "^5.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create config.ts**

```typescript
// apps/server/src/config.ts

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/posgl",
  jwtSecret: process.env.JWT_SECRET || "posgl-dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
};
```

- [ ] **Step 3: Create .env.example**

```
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/posgl
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
```

- [ ] **Step 4: Install dependencies**

Run: `cd apps/server && pnpm install`

- [ ] **Step 5: Commit**

```bash
git add apps/server/package.json apps/server/src/config.ts apps/server/.env.example pnpm-lock.yaml
git commit -m "feat(server): add Fastify dependencies and config"
```

---

### Task 2: Create Fastify App Entry Point with CORS

**Files:**
- Create: `apps/server/src/index.ts`

- [ ] **Step 1: Create the Fastify app**

```typescript
// apps/server/src/index.ts

import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`POSGL Server running on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

- [ ] **Step 2: Verify server starts**

Run: `cd apps/server && pnpm dev`
Expected: Server starts, logs "POSGL Server running on http://0.0.0.0:3000"
Stop with Ctrl+C after verifying.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat(server): create Fastify entry point with health check"
```

---

### Task 3: Create Error Handler Plugin

**Files:**
- Create: `apps/server/src/plugins/error-handler.ts`

- [ ] **Step 1: Create error handler**

```typescript
// apps/server/src/plugins/error-handler.ts

import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

interface AppError {
  statusCode: number;
  message: string;
}

function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    "message" in err
  );
}

async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (error: Error & { statusCode?: number; validation?: unknown }, _request: FastifyRequest, reply: FastifyReply) => {
      // Validation errors from Fastify/Zod
      if (error.validation) {
        return reply.status(400).send({
          error: "Validation Error",
          message: error.message,
        });
      }

      const statusCode = error.statusCode || 500;
      const message =
        statusCode === 500 ? "Internal Server Error" : error.message;

      if (statusCode === 500) {
        app.log.error(error);
      }

      return reply.status(statusCode).send({
        error: statusCode >= 500 ? "Internal Server Error" : "Error",
        message,
      });
    }
  );
}

export default fp(errorHandler, { name: "error-handler" });
```

Note: Add `fastify-plugin` to dependencies:
```bash
pnpm add fastify-plugin --filter @posgl/server
```

- [ ] **Step 2: Register in index.ts**

Add to apps/server/src/index.ts after cors registration:
```typescript
import errorHandler from "./plugins/error-handler.js";

await app.register(errorHandler);
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/plugins/error-handler.ts apps/server/src/index.ts apps/server/package.json pnpm-lock.yaml
git commit -m "feat(server): add centralized error handler plugin"
```

---

### Task 4: Create JWT Auth Plugin and Middleware

**Files:**
- Create: `apps/server/src/plugins/auth.ts`
- Create: `apps/server/src/middleware/require-auth.ts`
- Create: `apps/server/src/middleware/require-admin.ts`

- [ ] **Step 1: Create auth plugin**

```typescript
// apps/server/src/plugins/auth.ts

import { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface JwtPayload {
  userId: number;
  username: string;
  rol: string;
  sucursalId: number;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("user", undefined);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return;

    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      request.user = payload;
    } catch {
      // Invalid token — user remains undefined, auth middleware will reject
    }
  });
}

export default fp(authPlugin, { name: "auth" });
```

- [ ] **Step 2: Create require-auth middleware**

```typescript
// apps/server/src/middleware/require-auth.ts

import { FastifyReply, FastifyRequest } from "fastify";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token de autenticación requerido",
    });
  }
}
```

- [ ] **Step 3: Create require-admin middleware**

```typescript
// apps/server/src/middleware/require-admin.ts

import { FastifyReply, FastifyRequest } from "fastify";

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token de autenticación requerido",
    });
  }
  if (request.user.rol !== "admin") {
    return reply.status(403).send({
      error: "Forbidden",
      message: "Se requieren permisos de administrador",
    });
  }
}
```

- [ ] **Step 4: Register auth plugin in index.ts**

Add to apps/server/src/index.ts:
```typescript
import authPlugin from "./plugins/auth.js";

await app.register(authPlugin);
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/plugins/auth.ts apps/server/src/middleware/require-auth.ts apps/server/src/middleware/require-admin.ts apps/server/src/index.ts
git commit -m "feat(server): add JWT auth plugin and middleware guards"
```

---

### Task 5: Create Pagination Helper

**Files:**
- Create: `apps/server/src/utils/pagination.ts`

- [ ] **Step 1: Create pagination utility**

```typescript
// apps/server/src/utils/pagination.ts

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function parsePagination(query: Record<string, unknown>): {
  offset: number;
  limit: number;
  page: number;
} {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { offset, limit, page };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/utils/pagination.ts
git commit -m "feat(server): add pagination helper utility"
```

---

### Task 6: Create Auth Routes (Login)

**Files:**
- Create: `apps/server/src/routes/auth.routes.ts`

- [ ] **Step 1: Create login route**

```typescript
// apps/server/src/routes/auth.routes.ts

import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";
import type { JwtPayload } from "../plugins/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post<{
    Body: { username: string; password: string };
  }>("/auth/login", async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.status(400).send({
        error: "Validation Error",
        message: "Username y password son requeridos",
      });
    }

    const user = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.username, username))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Credenciales inválidas",
      });
    }

    if (!user.activo) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Usuario desactivado",
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Credenciales inválidas",
      });
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      rol: user.rol,
      sucursalId: user.sucursalId,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        rol: user.rol,
        sucursalId: user.sucursalId,
      },
    };
  });

  app.get("/auth/me", {
    preHandler: [app.authenticate],
    handler: async (request) => {
      const user = await db
        .select({
          id: schema.usuarios.id,
          nombre: schema.usuarios.nombre,
          username: schema.usuarios.username,
          rol: schema.usuarios.rol,
          sucursalId: schema.usuarios.sucursalId,
        })
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, request.user!.userId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!user) {
        return { error: "Not Found", message: "Usuario no encontrado" };
      }

      return user;
    },
  });
}
```

Wait — we need to add `authenticate` as a decorator. Update the auth plugin to add it:

```typescript
// In apps/server/src/plugins/auth.ts, add to the authPlugin function:

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token de autenticación requerido",
      });
    }
  });
```

And add the type declaration:
```typescript
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

- [ ] **Step 2: Register auth routes in index.ts**

```typescript
import { authRoutes } from "./routes/auth.routes.js";

await app.register(authRoutes);
```

- [ ] **Step 3: Update seed.ts to hash the admin password**

Update the seed to use bcrypt:
```typescript
import bcrypt from "bcrypt";

// Replace the placeholder hash line with:
const passwordHash = await bcrypt.hash("admin123", 10);

// Then use it:
passwordHash: passwordHash,
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/auth.routes.ts apps/server/src/plugins/auth.ts apps/server/src/index.ts apps/server/src/db/seed.ts
git commit -m "feat(server): add auth routes - login and /me endpoint"
```

---

### Task 7: Create Sucursales CRUD Routes

**Files:**
- Create: `apps/server/src/routes/sucursales.routes.ts`

- [ ] **Step 1: Create sucursales routes**

```typescript
// apps/server/src/routes/sucursales.routes.ts

import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function sucursalesRoutes(app: FastifyInstance) {
  // GET /sucursales — list all (paginated, searchable)
  app.get("/sucursales", {
    preHandler: [requireAuth],
    handler: async (request) => {
      const query = request.query as Record<string, unknown>;
      const { offset, limit, page } = parsePagination(query);
      const search = query.search as string | undefined;

      let whereClause;
      if (search) {
        whereClause = or(
          like(schema.sucursales.nombre, `%${search}%`),
          like(schema.sucursales.direccion, `%${search}%`)
        );
      }

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(schema.sucursales)
          .where(whereClause)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.sucursales)
          .where(whereClause),
      ]);

      return buildPaginatedResponse(data, Number(countResult[0].count), page, limit);
    },
  });

  // GET /sucursales/:id
  app.get<{ Params: { id: string } }>("/sucursales/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const sucursal = await db
        .select()
        .from(schema.sucursales)
        .where(eq(schema.sucursales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!sucursal) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Sucursal no encontrada",
        });
      }

      return sucursal;
    },
  });

  // POST /sucursales
  app.post<{
    Body: {
      nombre: string;
      direccion?: string;
      telefono?: string;
      rfc?: string;
      razonSocial?: string;
      regimenFiscal?: string;
      codigoPostal?: string;
    };
  }>("/sucursales", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const { nombre, direccion, telefono, rfc, razonSocial, regimenFiscal, codigoPostal } = request.body;

      if (!nombre) {
        return reply.status(400).send({
          error: "Validation Error",
          message: "El nombre es requerido",
        });
      }

      const [sucursal] = await db
        .insert(schema.sucursales)
        .values({ nombre, direccion, telefono, rfc, razonSocial, regimenFiscal, codigoPostal })
        .returning();

      return reply.status(201).send(sucursal);
    },
  });

  // PUT /sucursales/:id
  app.put<{
    Params: { id: string };
    Body: {
      nombre?: string;
      direccion?: string;
      telefono?: string;
      rfc?: string;
      razonSocial?: string;
      regimenFiscal?: string;
      codigoPostal?: string;
      activa?: boolean;
    };
  }>("/sucursales/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const existing = await db
        .select()
        .from(schema.sucursales)
        .where(eq(schema.sucursales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Sucursal no encontrada",
        });
      }

      const [updated] = await db
        .update(schema.sucursales)
        .set(request.body)
        .where(eq(schema.sucursales.id, id))
        .returning();

      return updated;
    },
  });

  // DELETE /sucursales/:id (soft delete — set activa=false)
  app.delete<{ Params: { id: string } }>("/sucursales/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);

      const existing = await db
        .select()
        .from(schema.sucursales)
        .where(eq(schema.sucursales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Sucursal no encontrada",
        });
      }

      await db
        .update(schema.sucursales)
        .set({ activa: false })
        .where(eq(schema.sucursales.id, id));

      return { message: "Sucursal desactivada" };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { sucursalesRoutes } from "./routes/sucursales.routes.js";

await app.register(sucursalesRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/sucursales.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add sucursales CRUD routes"
```

---

### Task 8: Create Terminales CRUD Routes

**Files:**
- Create: `apps/server/src/routes/terminales.routes.ts`

- [ ] **Step 1: Create terminales routes**

```typescript
// apps/server/src/routes/terminales.routes.ts

import { FastifyInstance } from "fastify";
import { eq, sql, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function terminalesRoutes(app: FastifyInstance) {
  // GET /terminales — list all, optionally filter by sucursalId
  app.get("/terminales", {
    preHandler: [requireAuth],
    handler: async (request) => {
      const query = request.query as Record<string, unknown>;
      const { offset, limit, page } = parsePagination(query);
      const sucursalId = query.sucursalId ? parseInt(query.sucursalId as string, 10) : undefined;

      const whereClause = sucursalId
        ? eq(schema.terminales.sucursalId, sucursalId)
        : undefined;

      const [data, countResult] = await Promise.all([
        db.select().from(schema.terminales).where(whereClause).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(schema.terminales).where(whereClause),
      ]);

      return buildPaginatedResponse(data, Number(countResult[0].count), page, limit);
    },
  });

  // GET /terminales/:id
  app.get<{ Params: { id: string } }>("/terminales/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const terminal = await db
        .select()
        .from(schema.terminales)
        .where(eq(schema.terminales.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!terminal) {
        return reply.status(404).send({ error: "Not Found", message: "Terminal no encontrada" });
      }
      return terminal;
    },
  });

  // POST /terminales
  app.post<{ Body: { nombre: string; sucursalId: number } }>("/terminales", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const { nombre, sucursalId } = request.body;
      if (!nombre || !sucursalId) {
        return reply.status(400).send({ error: "Validation Error", message: "nombre y sucursalId son requeridos" });
      }

      const [terminal] = await db
        .insert(schema.terminales)
        .values({ nombre, sucursalId })
        .returning();

      return reply.status(201).send(terminal);
    },
  });

  // PUT /terminales/:id
  app.put<{ Params: { id: string }; Body: { nombre?: string; activa?: boolean } }>("/terminales/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.terminales).where(eq(schema.terminales.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Terminal no encontrada" });
      }

      const [updated] = await db.update(schema.terminales).set(request.body).where(eq(schema.terminales.id, id)).returning();
      return updated;
    },
  });

  // DELETE /terminales/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/terminales/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.terminales).where(eq(schema.terminales.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Terminal no encontrada" });
      }

      await db.update(schema.terminales).set({ activa: false }).where(eq(schema.terminales.id, id));
      return { message: "Terminal desactivada" };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts and commit**

```bash
git add apps/server/src/routes/terminales.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add terminales CRUD routes"
```

---

### Task 9: Create Usuarios CRUD Routes

**Files:**
- Create: `apps/server/src/routes/usuarios.routes.ts`

- [ ] **Step 1: Create usuarios routes**

```typescript
// apps/server/src/routes/usuarios.routes.ts

import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db, schema } from "../db/index.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

const userSelect = {
  id: schema.usuarios.id,
  nombre: schema.usuarios.nombre,
  username: schema.usuarios.username,
  rol: schema.usuarios.rol,
  sucursalId: schema.usuarios.sucursalId,
  activo: schema.usuarios.activo,
  syncId: schema.usuarios.syncId,
  createdAt: schema.usuarios.createdAt,
};

export async function usuariosRoutes(app: FastifyInstance) {
  // GET /usuarios
  app.get("/usuarios", {
    preHandler: [requireAdmin],
    handler: async (request) => {
      const query = request.query as Record<string, unknown>;
      const { offset, limit, page } = parsePagination(query);
      const search = query.search as string | undefined;

      let whereClause;
      if (search) {
        whereClause = or(
          like(schema.usuarios.nombre, `%${search}%`),
          like(schema.usuarios.username, `%${search}%`)
        );
      }

      const [data, countResult] = await Promise.all([
        db.select(userSelect).from(schema.usuarios).where(whereClause).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(schema.usuarios).where(whereClause),
      ]);

      return buildPaginatedResponse(data, Number(countResult[0].count), page, limit);
    },
  });

  // GET /usuarios/:id
  app.get<{ Params: { id: string } }>("/usuarios/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const user = await db.select(userSelect).from(schema.usuarios).where(eq(schema.usuarios.id, id)).limit(1).then((r) => r[0]);
      if (!user) {
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }
      return user;
    },
  });

  // POST /usuarios
  app.post<{
    Body: { nombre: string; username: string; password: string; rol: string; sucursalId: number };
  }>("/usuarios", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const { nombre, username, password, rol, sucursalId } = request.body;

      if (!nombre || !username || !password || !rol || !sucursalId) {
        return reply.status(400).send({ error: "Validation Error", message: "Todos los campos son requeridos" });
      }

      if (rol !== "admin" && rol !== "cajero") {
        return reply.status(400).send({ error: "Validation Error", message: "Rol debe ser 'admin' o 'cajero'" });
      }

      // Check unique username
      const existing = await db.select().from(schema.usuarios).where(eq(schema.usuarios.username, username)).limit(1).then((r) => r[0]);
      if (existing) {
        return reply.status(409).send({ error: "Conflict", message: "El username ya existe" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [user] = await db
        .insert(schema.usuarios)
        .values({ nombre, username, passwordHash, rol, sucursalId })
        .returning();

      return reply.status(201).send({
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        rol: user.rol,
        sucursalId: user.sucursalId,
      });
    },
  });

  // PUT /usuarios/:id
  app.put<{
    Params: { id: string };
    Body: { nombre?: string; password?: string; rol?: string; sucursalId?: number; activo?: boolean };
  }>("/usuarios/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }

      const updateData: Record<string, unknown> = { ...request.body };

      if (updateData.password) {
        updateData.passwordHash = await bcrypt.hash(updateData.password as string, 10);
        delete updateData.password;
      }

      const [updated] = await db.update(schema.usuarios).set(updateData).where(eq(schema.usuarios.id, id)).returning();

      return {
        id: updated.id,
        nombre: updated.nombre,
        username: updated.username,
        rol: updated.rol,
        sucursalId: updated.sucursalId,
        activo: updated.activo,
      };
    },
  });

  // DELETE /usuarios/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/usuarios/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }

      await db.update(schema.usuarios).set({ activo: false }).where(eq(schema.usuarios.id, id));
      return { message: "Usuario desactivado" };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts and commit**

```bash
git add apps/server/src/routes/usuarios.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add usuarios CRUD routes with password hashing"
```

---

### Task 10: Create Categorias CRUD Routes

**Files:**
- Create: `apps/server/src/routes/categorias.routes.ts`

- [ ] **Step 1: Create categorias routes**

```typescript
// apps/server/src/routes/categorias.routes.ts

import { FastifyInstance } from "fastify";
import { eq, sql, like, isNull } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function categoriasRoutes(app: FastifyInstance) {
  // GET /categorias — list, optionally filter by parent
  app.get("/categorias", {
    preHandler: [requireAuth],
    handler: async (request) => {
      const query = request.query as Record<string, unknown>;
      const { offset, limit, page } = parsePagination(query);
      const parentId = query.parentId as string | undefined;

      let whereClause;
      if (parentId === "root") {
        whereClause = isNull(schema.categorias.categoriaPadreId);
      } else if (parentId) {
        whereClause = eq(schema.categorias.categoriaPadreId, parseInt(parentId, 10));
      }

      const [data, countResult] = await Promise.all([
        db.select().from(schema.categorias).where(whereClause).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(schema.categorias).where(whereClause),
      ]);

      return buildPaginatedResponse(data, Number(countResult[0].count), page, limit);
    },
  });

  // GET /categorias/:id
  app.get<{ Params: { id: string } }>("/categorias/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const cat = await db.select().from(schema.categorias).where(eq(schema.categorias.id, id)).limit(1).then((r) => r[0]);
      if (!cat) {
        return reply.status(404).send({ error: "Not Found", message: "Categoría no encontrada" });
      }
      return cat;
    },
  });

  // POST /categorias
  app.post<{ Body: { nombre: string; categoriaPadreId?: number } }>("/categorias", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const { nombre, categoriaPadreId } = request.body;
      if (!nombre) {
        return reply.status(400).send({ error: "Validation Error", message: "El nombre es requerido" });
      }

      const [cat] = await db.insert(schema.categorias).values({ nombre, categoriaPadreId }).returning();
      return reply.status(201).send(cat);
    },
  });

  // PUT /categorias/:id
  app.put<{ Params: { id: string }; Body: { nombre?: string; categoriaPadreId?: number; activa?: boolean } }>("/categorias/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.categorias).where(eq(schema.categorias.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Categoría no encontrada" });
      }

      const [updated] = await db.update(schema.categorias).set(request.body).where(eq(schema.categorias.id, id)).returning();
      return updated;
    },
  });

  // DELETE /categorias/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/categorias/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.categorias).where(eq(schema.categorias.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Categoría no encontrada" });
      }

      await db.update(schema.categorias).set({ activa: false }).where(eq(schema.categorias.id, id));
      return { message: "Categoría desactivada" };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts and commit**

```bash
git add apps/server/src/routes/categorias.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add categorias CRUD routes with parent filtering"
```

---

### Task 11: Create Productos CRUD Routes (with Stock)

**Files:**
- Create: `apps/server/src/routes/productos.routes.ts`

- [ ] **Step 1: Create productos routes**

```typescript
// apps/server/src/routes/productos.routes.ts

import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function productosRoutes(app: FastifyInstance) {
  // GET /productos — list with search, pagination, optional category filter
  app.get("/productos", {
    preHandler: [requireAuth],
    handler: async (request) => {
      const query = request.query as Record<string, unknown>;
      const { offset, limit, page } = parsePagination(query);
      const search = query.search as string | undefined;
      const categoriaId = query.categoriaId ? parseInt(query.categoriaId as string, 10) : undefined;

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(schema.productos.nombre, `%${search}%`),
            like(schema.productos.sku, `%${search}%`),
            like(schema.productos.codigoBarras, `%${search}%`)
          )
        );
      }
      if (categoriaId) {
        conditions.push(eq(schema.productos.categoriaId, categoriaId));
      }

      const whereClause = conditions.length > 0
        ? sql`${sql.join(conditions.map(c => sql`(${c})`), sql` AND `)}`
        : undefined;

      const [data, countResult] = await Promise.all([
        db.select().from(schema.productos).where(whereClause).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(schema.productos).where(whereClause),
      ]);

      return buildPaginatedResponse(data, Number(countResult[0].count), page, limit);
    },
  });

  // GET /productos/:id — include stock by sucursal
  app.get<{ Params: { id: string } }>("/productos/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const producto = await db.select().from(schema.productos).where(eq(schema.productos.id, id)).limit(1).then((r) => r[0]);
      if (!producto) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }

      const stock = await db
        .select()
        .from(schema.stockSucursal)
        .where(eq(schema.stockSucursal.productoId, id));

      return { ...producto, stock };
    },
  });

  // GET /productos/barcode/:code — lookup by barcode (used by POS scanner)
  app.get<{ Params: { code: string } }>("/productos/barcode/:code", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const code = request.params.code;
      const producto = await db
        .select()
        .from(schema.productos)
        .where(eq(schema.productos.codigoBarras, code))
        .limit(1)
        .then((r) => r[0]);

      if (!producto) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }

      return producto;
    },
  });

  // POST /productos
  app.post<{
    Body: {
      nombre: string;
      sku?: string;
      codigoBarras?: string;
      precioVenta: number;
      costo?: number;
      categoriaId?: number;
      stockMinimo?: number;
      claveSat?: string;
      unidadSat?: string;
      tasaIva?: number;
    };
  }>("/productos", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const body = request.body;
      if (!body.nombre || body.precioVenta === undefined) {
        return reply.status(400).send({ error: "Validation Error", message: "nombre y precioVenta son requeridos" });
      }

      const [producto] = await db.insert(schema.productos).values(body).returning();
      return reply.status(201).send(producto);
    },
  });

  // PUT /productos/:id
  app.put<{
    Params: { id: string };
    Body: {
      nombre?: string;
      sku?: string;
      codigoBarras?: string;
      precioVenta?: number;
      costo?: number;
      categoriaId?: number;
      stockMinimo?: number;
      claveSat?: string;
      unidadSat?: string;
      tasaIva?: number;
      activo?: boolean;
    };
  }>("/productos/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.productos).where(eq(schema.productos.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }

      const [updated] = await db.update(schema.productos).set(request.body).where(eq(schema.productos.id, id)).returning();
      return updated;
    },
  });

  // DELETE /productos/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/productos/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.productos).where(eq(schema.productos.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Producto no encontrado" });
      }

      await db.update(schema.productos).set({ activo: false }).where(eq(schema.productos.id, id));
      return { message: "Producto desactivado" };
    },
  });
}
```

- [ ] **Step 2: Register in index.ts and commit**

```bash
git add apps/server/src/routes/productos.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add productos CRUD routes with barcode lookup and stock"
```

---

### Task 12: Create Clientes and Proveedores CRUD Routes

**Files:**
- Create: `apps/server/src/routes/clientes.routes.ts`
- Create: `apps/server/src/routes/proveedores.routes.ts`

- [ ] **Step 1: Create clientes routes**

```typescript
// apps/server/src/routes/clientes.routes.ts

import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function clientesRoutes(app: FastifyInstance) {
  // GET /clientes
  app.get("/clientes", {
    preHandler: [requireAuth],
    handler: async (request) => {
      const query = request.query as Record<string, unknown>;
      const { offset, limit, page } = parsePagination(query);
      const search = query.search as string | undefined;

      let whereClause;
      if (search) {
        whereClause = or(
          like(schema.clientes.nombre, `%${search}%`),
          like(schema.clientes.rfc, `%${search}%`),
          like(schema.clientes.telefono, `%${search}%`)
        );
      }

      const [data, countResult] = await Promise.all([
        db.select().from(schema.clientes).where(whereClause).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(schema.clientes).where(whereClause),
      ]);

      return buildPaginatedResponse(data, Number(countResult[0].count), page, limit);
    },
  });

  // GET /clientes/:id
  app.get<{ Params: { id: string } }>("/clientes/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const cliente = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id)).limit(1).then((r) => r[0]);
      if (!cliente) {
        return reply.status(404).send({ error: "Not Found", message: "Cliente no encontrado" });
      }
      return cliente;
    },
  });

  // POST /clientes
  app.post<{
    Body: {
      nombre: string;
      telefono?: string;
      email?: string;
      rfc?: string;
      razonSocial?: string;
      regimenFiscal?: string;
      usoCfdi?: string;
      domicilioFiscal?: string;
      limiteCredito?: number;
    };
  }>("/clientes", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const { nombre } = request.body;
      if (!nombre) {
        return reply.status(400).send({ error: "Validation Error", message: "El nombre es requerido" });
      }

      const [cliente] = await db.insert(schema.clientes).values(request.body).returning();
      return reply.status(201).send(cliente);
    },
  });

  // PUT /clientes/:id
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>("/clientes/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Cliente no encontrado" });
      }

      const [updated] = await db.update(schema.clientes).set(request.body).where(eq(schema.clientes.id, id)).returning();
      return updated;
    },
  });

  // DELETE /clientes/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/clientes/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Cliente no encontrado" });
      }

      await db.update(schema.clientes).set({ activo: false }).where(eq(schema.clientes.id, id));
      return { message: "Cliente desactivado" };
    },
  });
}
```

- [ ] **Step 2: Create proveedores routes**

```typescript
// apps/server/src/routes/proveedores.routes.ts

import { FastifyInstance } from "fastify";
import { eq, sql, like, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { parsePagination, buildPaginatedResponse } from "../utils/pagination.js";

export async function proveedoresRoutes(app: FastifyInstance) {
  // GET /proveedores
  app.get("/proveedores", {
    preHandler: [requireAuth],
    handler: async (request) => {
      const query = request.query as Record<string, unknown>;
      const { offset, limit, page } = parsePagination(query);
      const search = query.search as string | undefined;

      let whereClause;
      if (search) {
        whereClause = or(
          like(schema.proveedores.nombre, `%${search}%`),
          like(schema.proveedores.rfc, `%${search}%`)
        );
      }

      const [data, countResult] = await Promise.all([
        db.select().from(schema.proveedores).where(whereClause).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(schema.proveedores).where(whereClause),
      ]);

      return buildPaginatedResponse(data, Number(countResult[0].count), page, limit);
    },
  });

  // GET /proveedores/:id
  app.get<{ Params: { id: string } }>("/proveedores/:id", {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const proveedor = await db.select().from(schema.proveedores).where(eq(schema.proveedores.id, id)).limit(1).then((r) => r[0]);
      if (!proveedor) {
        return reply.status(404).send({ error: "Not Found", message: "Proveedor no encontrado" });
      }
      return proveedor;
    },
  });

  // POST /proveedores
  app.post<{
    Body: { nombre: string; contacto?: string; telefono?: string; email?: string; rfc?: string };
  }>("/proveedores", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const { nombre } = request.body;
      if (!nombre) {
        return reply.status(400).send({ error: "Validation Error", message: "El nombre es requerido" });
      }

      const [proveedor] = await db.insert(schema.proveedores).values(request.body).returning();
      return reply.status(201).send(proveedor);
    },
  });

  // PUT /proveedores/:id
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>("/proveedores/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.proveedores).where(eq(schema.proveedores.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Proveedor no encontrado" });
      }

      const [updated] = await db.update(schema.proveedores).set(request.body).where(eq(schema.proveedores.id, id)).returning();
      return updated;
    },
  });

  // DELETE /proveedores/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/proveedores/:id", {
    preHandler: [requireAdmin],
    handler: async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      const existing = await db.select().from(schema.proveedores).where(eq(schema.proveedores.id, id)).limit(1).then((r) => r[0]);
      if (!existing) {
        return reply.status(404).send({ error: "Not Found", message: "Proveedor no encontrado" });
      }

      await db.update(schema.proveedores).set({ activo: false }).where(eq(schema.proveedores.id, id));
      return { message: "Proveedor desactivado" };
    },
  });
}
```

- [ ] **Step 3: Register both in index.ts and commit**

```bash
git add apps/server/src/routes/clientes.routes.ts apps/server/src/routes/proveedores.routes.ts apps/server/src/index.ts
git commit -m "feat(server): add clientes and proveedores CRUD routes"
```

---

### Task 13: Generate PostgreSQL Migrations and Verify Server Starts

- [ ] **Step 1: Generate Drizzle migrations**

Run: `cd apps/server && pnpm db:generate`
Expected: Migration SQL files generated in `apps/server/drizzle/`

NOTE: This requires PostgreSQL running. If PostgreSQL is not available, skip migration generation and just verify TypeScript compilation.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/server && pnpm build`
Expected: No compilation errors

- [ ] **Step 3: Verify server starts (if PostgreSQL available)**

Run: `cd apps/server && pnpm dev`
Expected: Server starts on port 3000, health check returns ok
If no PostgreSQL: skip this step.

- [ ] **Step 4: Commit migrations and any fixes**

```bash
git add apps/server/drizzle/ apps/server/
git commit -m "feat(server): generate PostgreSQL migrations and verify build"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install deps + config | package.json, config.ts, .env.example |
| 2 | Fastify entry point | index.ts |
| 3 | Error handler plugin | plugins/error-handler.ts |
| 4 | JWT auth plugin + middleware | plugins/auth.ts, middleware/*.ts |
| 5 | Pagination helper | utils/pagination.ts |
| 6 | Auth routes (login) | routes/auth.routes.ts |
| 7 | Sucursales CRUD | routes/sucursales.routes.ts |
| 8 | Terminales CRUD | routes/terminales.routes.ts |
| 9 | Usuarios CRUD | routes/usuarios.routes.ts |
| 10 | Categorias CRUD | routes/categorias.routes.ts |
| 11 | Productos CRUD + stock + barcode | routes/productos.routes.ts |
| 12 | Clientes + Proveedores CRUD | routes/clientes.routes.ts, proveedores.routes.ts |
| 13 | Migrations + verify build | drizzle/, build verification |

### API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | - | Health check |
| POST | /auth/login | - | Login, returns JWT |
| GET | /auth/me | auth | Current user info |
| CRUD | /sucursales | admin | Manage branches |
| CRUD | /terminales | admin | Manage POS terminals |
| CRUD | /usuarios | admin | Manage users |
| CRUD | /categorias | admin | Manage categories |
| CRUD | /productos | admin | Manage products |
| GET | /productos/barcode/:code | auth | Barcode lookup |
| CRUD | /clientes | auth/admin | Manage customers |
| CRUD | /proveedores | admin | Manage suppliers |
