import Fastify from "fastify";
import cors from "@fastify/cors";
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

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
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
