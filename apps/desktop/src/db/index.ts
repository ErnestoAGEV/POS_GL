import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@posgl/shared/schemas";
import { join } from "path";

const dbPath = process.env.POSGL_DB_PATH || join(process.cwd(), "posgl.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
export { sqlite };
