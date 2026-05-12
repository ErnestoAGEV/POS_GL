import { text, integer } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";

export const syncColumns = {
  syncId: text("sync_id").$defaultFn(() => uuidv4()).notNull().unique(),
  updatedAt: text("updated_at")
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString())
    .notNull(),
  syncStatus: text("sync_status", { enum: ["pendiente", "sincronizado"] })
    .default("pendiente")
    .notNull(),
};

export const timestampColumns = {
  createdAt: text("created_at")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
};
