import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Used by Prisma CLI (migrate/push). Points to local SQLite for schema operations.
    // Runtime connections go through the libSQL adapter to Turso.
    url: process.env["DATABASE_URL"]!,
  },
});
