import { IpcMain } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, like, or } from "drizzle-orm";
import * as schema from "@posgl/shared/schemas";
import { join } from "path";
import { app } from "electron";

const dbPath = join(app.getPath("userData"), "posgl.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

export function registerIpcHandlers(ipcMain: IpcMain) {
  ipcMain.handle("products:search", async (_event, query: string) => {
    if (!query || query.trim().length === 0) {
      return db.select().from(schema.productos)
        .where(eq(schema.productos.activo, true))
        .limit(20)
        .all();
    }
    return db.select().from(schema.productos)
      .where(
        or(
          like(schema.productos.nombre, `%${query}%`),
          like(schema.productos.sku, `%${query}%`),
          eq(schema.productos.codigoBarras, query)
        )
      )
      .limit(20)
      .all();
  });

  ipcMain.handle("products:barcode", async (_event, code: string) => {
    return db.select().from(schema.productos)
      .where(eq(schema.productos.codigoBarras, code))
      .limit(1)
      .all()
      .then(rows => rows[0] || null);
  });

  ipcMain.handle("categories:list", async () => {
    return db.select().from(schema.categorias)
      .where(eq(schema.categorias.activa, true))
      .all();
  });
}
