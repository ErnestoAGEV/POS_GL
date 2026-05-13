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
