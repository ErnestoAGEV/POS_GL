import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (error: Error & { statusCode?: number; validation?: unknown }, _request: FastifyRequest, reply: FastifyReply) => {
      if (error.validation) {
        return reply.status(400).send({
          error: "Validation Error",
          message: error.message,
        });
      }

      const statusCode = error.statusCode || 500;
      const message = statusCode === 500 ? "Internal Server Error" : error.message;

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
