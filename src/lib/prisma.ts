/**
 * Singleton Prisma client for the WhatsApp Broadcasting Application.
 *
 * In development, Next.js hot-reloading can create multiple PrismaClient
 * instances which exhaust the database connection pool. We store the client
 * on the Node.js global object so it is reused across hot-reloads.
 *
 * In production a single module-level instance is sufficient because the
 * module cache is never invalidated.
 *
 * Validates: Requirements 9.3
 */

import { PrismaClient } from "@prisma/client";

// Extend the global type so TypeScript knows about our cached client.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

  // Verify the connection is reachable at startup and surface a clear error
  // if the database is unavailable (ERR_001 in the error catalogue).
  client.$connect().catch((err: unknown) => {
    console.error(
      "[prisma] Failed to connect to the database (ERR_001):",
      err instanceof Error ? err.message : err
    );
    // Do not throw here — the application can still start and individual
    // queries will surface their own errors with proper context.
  });

  return client;
}

// Reuse the existing client in development; create a fresh one otherwise.
const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (globalThis.__prisma ?? (globalThis.__prisma = createPrismaClient()));

export default prisma;
