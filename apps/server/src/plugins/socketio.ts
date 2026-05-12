import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

export default fp(async function socketioPlugin(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/ws",
  });

  app.decorate("io", io);

  io.on("connection", (socket) => {
    app.log.info(`Terminal connected: ${socket.id}`);

    socket.on("terminal:identify", (data: { terminalId: number; sucursalId: number }) => {
      socket.join(`sucursal:${data.sucursalId}`);
      socket.join(`terminal:${data.terminalId}`);
      app.log.info(`Terminal ${data.terminalId} joined sucursal ${data.sucursalId}`);
    });

    socket.on("disconnect", (reason) => {
      app.log.info(`Terminal disconnected: ${socket.id} (${reason})`);
    });
  });

  app.addHook("onClose", async () => {
    io.close();
  });
});
