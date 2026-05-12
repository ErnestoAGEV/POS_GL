import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const dbPath = process.env.POSGL_DB_PATH || "./posgl.db";

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

console.log("Running SQLite migrations...");
migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations complete.");

sqlite.close();
