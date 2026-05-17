import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { logAudit } from "../utils/audit.js";

const DEFAULT_SETTINGS: Record<string, { valor: string; descripcion: string }> = {
  "negocio.nombre": { valor: "Mi Negocio", descripcion: "Nombre del negocio" },
  "negocio.rfc": { valor: "", descripcion: "RFC del negocio" },
  "negocio.razonSocial": { valor: "", descripcion: "Razon social" },
  "negocio.regimenFiscal": { valor: "", descripcion: "Regimen fiscal SAT" },
  "negocio.codigoPostal": { valor: "", descripcion: "Codigo postal fiscal" },
  "negocio.direccion": { valor: "", descripcion: "Direccion del negocio" },
  "negocio.telefono": { valor: "", descripcion: "Telefono de contacto" },
  "negocio.email": { valor: "", descripcion: "Email de contacto" },
  "ticket.encabezado": { valor: "Gracias por su compra", descripcion: "Texto superior del ticket" },
  "ticket.pie": { valor: "Cambios y devoluciones dentro de 30 dias con ticket", descripcion: "Texto inferior del ticket" },
  "ticket.mostrarLogo": { valor: "true", descripcion: "Mostrar logo en ticket" },
  "venta.tasaIvaDefault": { valor: "0.16", descripcion: "Tasa de IVA por defecto" },
  "venta.folioSerie": { valor: "V", descripcion: "Serie del folio de ventas" },
  "venta.permitirDescuento": { valor: "true", descripcion: "Permitir descuentos en ventas" },
  "venta.descuentoMaximo": { valor: "50", descripcion: "Porcentaje maximo de descuento" },
  "stock.alertaEmail": { valor: "false", descripcion: "Enviar email en alerta de stock bajo" },
  "stock.minimoDefault": { valor: "5", descripcion: "Stock minimo por defecto" },
};

export async function configuracionRoutes(app: FastifyInstance) {
  // GET /configuracion — list all settings
  app.get("/configuracion", {
    preHandler: [app.authenticate, requireAuth],
    handler: async () => {
      const rows = await db.select().from(schema.configuracion);

      // Merge with defaults (show missing keys with their defaults)
      const result: Record<string, { valor: string; descripcion: string | null }> = {};
      for (const [clave, def] of Object.entries(DEFAULT_SETTINGS)) {
        result[clave] = { valor: def.valor, descripcion: def.descripcion };
      }
      for (const row of rows) {
        result[row.clave] = { valor: row.valor, descripcion: row.descripcion };
      }
      return result;
    },
  });

  // PUT /configuracion — bulk update settings (admin only)
  app.put<{ Body: Record<string, string> }>("/configuracion", {
    preHandler: [app.authenticate, requireAdmin],
    handler: async (request, reply) => {
      const updates = request.body;
      if (!updates || typeof updates !== "object") {
        return reply.status(400).send({ message: "Body must be an object of key-value pairs" });
      }

      const validKeys = Object.keys(DEFAULT_SETTINGS);
      const entries = Object.entries(updates).filter(([k]) => validKeys.includes(k));

      for (const [clave, valor] of entries) {
        const existing = await db
          .select()
          .from(schema.configuracion)
          .where(eq(schema.configuracion.clave, clave))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(schema.configuracion)
            .set({ valor, updatedAt: new Date() })
            .where(eq(schema.configuracion.clave, clave));
        } else {
          await db.insert(schema.configuracion).values({
            clave,
            valor,
            descripcion: DEFAULT_SETTINGS[clave]?.descripcion || null,
          });
        }
      }

      await logAudit({
        usuarioId: (request as any).user.id,
        accion: "actualizar",
        entidad: "configuracion",
        descripcion: `Actualizadas ${entries.length} configuraciones`,
      });

      return { message: "Configuracion actualizada", updated: entries.length };
    },
  });

  // POST /configuracion/seed — initialize default settings (admin only)
  app.post("/configuracion/seed", {
    preHandler: [app.authenticate, requireAdmin],
    handler: async () => {
      let created = 0;
      for (const [clave, def] of Object.entries(DEFAULT_SETTINGS)) {
        const existing = await db
          .select()
          .from(schema.configuracion)
          .where(eq(schema.configuracion.clave, clave))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.configuracion).values({
            clave,
            valor: def.valor,
            descripcion: def.descripcion,
          });
          created++;
        }
      }
      return { message: "Seed completado", created };
    },
  });
}
