import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "../../packages/shared/src/schemas/*.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./posgl.db",
  },
});
