import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import errorHandler from "./plugins/error-handler.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.routes.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

await app.register(errorHandler);
await app.register(authPlugin);
await app.register(authRoutes);

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
