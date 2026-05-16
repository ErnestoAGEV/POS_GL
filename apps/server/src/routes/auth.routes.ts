import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { db, schema } from "../db/index.js";
import { config } from "../config.js";
import type { JwtPayload } from "../plugins/auth.js";
import { loginSchema } from "../schemas/validation.js";
import { validateBody } from "../utils/validate.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login — stricter rate limit for brute-force protection
  app.post<{
    Body: { username: string; password: string };
  }>("/auth/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    const parsed = validateBody(loginSchema, request.body, reply);
    if (!parsed) return;

    const { username, password } = parsed;

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

    const signOptions: SignOptions = {
      expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
    };
    const token = jwt.sign(payload, config.jwtSecret, signOptions);

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

  // GET /auth/me
  app.get("/auth/me", {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
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
        return reply.status(404).send({ error: "Not Found", message: "Usuario no encontrado" });
      }

      return user;
    },
  });
}
