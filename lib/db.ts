import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function makeClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || makeClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** No-op kept for call-site compatibility. */
export async function ensureDb() {
  // SQLite file / Postgres are ready via DATABASE_URL.
}

/** No-op kept for call-site compatibility. */
export async function persistDb() {
  // Durable via Prisma.
}
