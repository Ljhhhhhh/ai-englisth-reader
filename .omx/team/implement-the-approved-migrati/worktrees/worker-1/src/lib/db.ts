import { PrismaClient } from '@prisma/client';

import { env } from '@/lib/env';
import { createPrismaMysqlAdapter } from '@/lib/prisma-mysql-adapter';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = createPrismaMysqlAdapter(env.DATABASE_URL);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const db = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = db;
}
