import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
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
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
      // Invalid token — user remains undefined
    }
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token de autenticación requerido",
      });
    }
  });
}

export default fp(authPlugin, { name: "auth" });
