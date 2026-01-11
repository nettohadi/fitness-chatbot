import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Use DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL;

console.log('🔍 Prisma initialization:');
console.log('  - DATABASE_URL exists:', !!connectionString);
console.log('  - Connection string preview:', connectionString ? `${connectionString.substring(0, 30)}...` : 'MISSING');
console.log('  - NODE_ENV:', process.env.NODE_ENV);

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Pool configuration using connection string from env
const poolConfig = {
  connectionString,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
