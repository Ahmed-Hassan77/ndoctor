import { PrismaClient } from "@prisma/client";

/**
 * Neon / PostgreSQL:
 * - DATABASE_URL: pooled connection (app runtime, serverless-friendly)
 * - DIRECT_URL: direct connection (Prisma migrate / introspect)
 * See prisma/schema.prisma datasource.
 */
export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

// globalThis.prisma: This global variable ensures that the Prisma client instance is
// reused across hot reloads during development. Without this, each time your application
// reloads, a new instance of the Prisma client would be created, potentially leading
// to connection issues.
