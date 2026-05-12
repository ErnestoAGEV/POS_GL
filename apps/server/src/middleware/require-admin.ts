import { FastifyReply, FastifyRequest } from "fastify";

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
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
