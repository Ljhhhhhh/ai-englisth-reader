import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, '');
}

export function createPrismaMysqlAdapter(databaseUrl: string) {
  const connectionUrl = new URL(databaseUrl);
  const database = trimLeadingSlash(connectionUrl.pathname);

  if (!database) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  return new PrismaMariaDb({
    database,
    host: connectionUrl.hostname,
    password: decodeURIComponent(connectionUrl.password),
    port: connectionUrl.port ? Number(connectionUrl.port) : 3306,
    user: decodeURIComponent(connectionUrl.username),
  });
}
