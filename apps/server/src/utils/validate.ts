import { FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or sends 400 response and returns null on failure.
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
  reply: FastifyReply
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    reply.status(400).send({
      error: "Datos invalidos",
      details: errors,
    });
    return null;
  }
  return result.data;
}
