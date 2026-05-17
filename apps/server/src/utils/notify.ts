import { FastifyInstance } from "fastify";

export interface NotificationPayload {
  tipo: "venta" | "stock_bajo" | "compra" | "traspaso" | "devolucion" | "corte" | "sistema";
  titulo: string;
  mensaje: string;
  datos?: Record<string, unknown>;
}

let appRef: FastifyInstance | null = null;

export function initNotifications(app: FastifyInstance) {
  appRef = app;
}

export function emitNotification(event: NotificationPayload) {
  if (!appRef) return;
  appRef.io.emit("notification", {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export function emitToSucursal(sucursalId: number, event: NotificationPayload) {
  if (!appRef) return;
  appRef.io.to(`sucursal:${sucursalId}`).emit("notification", {
    ...event,
    timestamp: new Date().toISOString(),
  });
}
