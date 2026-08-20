import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 config. Connection URLs live here, not in schema.prisma.
 *
 * DATABASE_URL        — pooled (Neon pooler / PgBouncer); used by the app at runtime.
 * DIRECT_DATABASE_URL — unpooled; required by migrate/introspect, which need
 *                       session-level features a transaction pooler does not expose.
 *
 * Left empty when unset so that offline commands (`validate`, `generate`,
 * `migrate diff --from-empty`) work without a database.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
});
