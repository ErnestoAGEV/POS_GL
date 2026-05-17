import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import socketioPlugin from "./plugins/socketio.js";
import { config } from "./config.js";
import errorHandler from "./plugins/error-handler.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.routes.js";
import { sucursalesRoutes } from "./routes/sucursales.routes.js";
import { terminalesRoutes } from "./routes/terminales.routes.js";
import { usuariosRoutes } from "./routes/usuarios.routes.js";
import { categoriasRoutes } from "./routes/categorias.routes.js";
import { productosRoutes } from "./routes/productos.routes.js";
import { clientesRoutes } from "./routes/clientes.routes.js";
import { proveedoresRoutes } from "./routes/proveedores.routes.js";
import { ventasRoutes } from "./routes/ventas.routes.js";
import { syncRoutes } from "./routes/sync.routes.js";
import { comprasRoutes } from "./routes/compras.routes.js";
import { traspasosRoutes } from "./routes/traspasos.routes.js";
import { stockRoutes } from "./routes/stock.routes.js";
import { cortesRoutes } from "./routes/cortes.routes.js";
import { facturasRoutes } from "./routes/facturas.routes.js";
import { promocionesRoutes } from "./routes/promociones.routes.js";
import { bitacoraRoutes } from "./routes/bitacora.routes.js";
import { devolucionesRoutes } from "./routes/devoluciones.routes.js";
import { apartadosRoutes } from "./routes/apartados.routes.js";
import { tarjetasRegaloRoutes } from "./routes/tarjetas-regalo.routes.js";
import { reportesRoutes } from "./routes/reportes.routes.js";
import { configuracionRoutes } from "./routes/configuracion.routes.js";

const app = Fastify({
  logger: true,
  genReqId: () => crypto.randomUUID(),
  requestIdHeader: "x-request-id",
});

await app.register(cors, {
  origin: config.nodeEnv === "production"
    ? (process.env.CORS_ORIGIN || "http://localhost:3000").split(",")
    : true,
});

await app.register(helmet, {
  contentSecurityPolicy: false, // Disable CSP for API server
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

app.addHook("onSend", async (request, reply) => {
  reply.header("x-request-id", request.id);
});

await app.register(socketioPlugin);

await app.register(errorHandler);
await app.register(authPlugin);
await app.register(authRoutes);
await app.register(sucursalesRoutes);
await app.register(terminalesRoutes);
await app.register(usuariosRoutes);
await app.register(categoriasRoutes);
await app.register(productosRoutes);
await app.register(clientesRoutes);
await app.register(proveedoresRoutes);
await app.register(ventasRoutes);
await app.register(syncRoutes);
await app.register(comprasRoutes);
await app.register(traspasosRoutes);
await app.register(stockRoutes);
await app.register(cortesRoutes);
await app.register(facturasRoutes);
await app.register(promocionesRoutes);
await app.register(bitacoraRoutes);
await app.register(devolucionesRoutes);
await app.register(apartadosRoutes);
await app.register(tarjetasRegaloRoutes);
await app.register(reportesRoutes);
await app.register(configuracionRoutes);

app.get("/health", async () => {
  let dbOk = false;
  try {
    const { db } = await import("./db/index.js");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch { /* db unreachable */ }

  const mem = process.memoryUsage();
  return {
    status: dbOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbOk ? "connected" : "unreachable",
    version: "0.1.0",
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
  };
});

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`POSGL Server running on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  await app.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
