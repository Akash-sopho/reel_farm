import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Reuse client instance during development to avoid exhausting connection pool
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['info', 'warn'],
    });
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;
