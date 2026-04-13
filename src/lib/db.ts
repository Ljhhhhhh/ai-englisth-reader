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

function getPrismaClient() {
  if (globalThis.prismaGlobal) {
    return globalThis.prismaGlobal;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = client;
  }

  return client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, property, receiver);

    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as PrismaClient;
