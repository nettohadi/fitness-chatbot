import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create PostgreSQL pool with explicit configuration
const connectionString = process.env.DATABASE_URL;

// Parse the connection string to ensure it's correct
const poolConfig = {
  connectionString,
  // Ensure the connection string is used correctly
  host: 'localhost',
  port: 5432,
  database: 'fitness_chatbot',
  user: 'hadi_sy',
};

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient; pool: Pool };

let pool: Pool;
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({
    adapter,
    log: ['error'],
  });
} else {
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool(poolConfig);
  }
  pool = globalForPrisma.pool;

  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
export default prisma;
