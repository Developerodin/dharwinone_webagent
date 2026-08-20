import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Process-wide Prisma singleton, created on first use.
 *
 * Lazy rather than eager for two reasons:
 *
 *  - Importing a module must not open a connection pool. Anything that pulls in
 *    a repository — a unit test for a pure helper, a CLI script, a type-only
 *    consumer — would otherwise need a live DATABASE_URL just to load.
 *  - A missing DATABASE_URL should surface as a clean error from the query that
 *    needed it, not as a crash during module evaluation before any handler or
 *    logger is wired up.
 *
 * `tsx watch` re-evaluates modules on every save, so the instance is cached on
 * globalThis in development; without that each reload would leak a pool and
 * exhaust the database's connection limit within minutes.
 */
const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

/**
 * Builds a client bound to the pooled connection string.
 */
function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "[db] DATABASE_URL is required. Set it in backend/.env — see .env.example.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
}

/**
 * Returns the shared client, creating it on first call.
 */
export function getPrisma(): PrismaClient {
  globalForPrisma.__prisma ??= createClient();
  return globalForPrisma.__prisma;
}

/**
 * The shared Prisma client.
 *
 * A proxy so that `prisma.project.findMany(...)` reads naturally at call sites
 * while construction is still deferred to the first actual query.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrisma(), property, receiver);
  },
  has(_target, property) {
    return Reflect.has(getPrisma(), property);
  },
});

/**
 * Closes the connection pool. Used by tests and graceful shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.__prisma) {
    await globalForPrisma.__prisma.$disconnect();
    globalForPrisma.__prisma = undefined;
  }
}
