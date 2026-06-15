let PrismaClient;
let PrismaPg;
let Pool;

try {
  ({ PrismaClient } = require("@prisma/client"));
  ({ PrismaPg } = require("@prisma/adapter-pg"));
  ({ Pool } = require("pg"));
} catch (error) {
  throw new Error(
    "Prisma PostgreSQL dependencies are missing. Run `npm install` and `npm run db:generate`."
  );
}

const globalForPrisma = globalThis;
const globalForPool = globalThis;

const pool =
  globalForPool.maharShwePgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.maharShwePgPool = pool;
}

const adapter = new PrismaPg(pool);

const prisma =
  globalForPrisma.maharShwePrisma ||
  new PrismaClient({
    adapter,
    log: process.env.PRISMA_QUERY_LOG === "true" ? ["query", "error", "warn"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.maharShwePrisma = prisma;
}

module.exports = { prisma };
