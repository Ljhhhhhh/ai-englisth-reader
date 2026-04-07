import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

try {
  loadEnvFile?.();
} catch (error) {
  if (
    !(error instanceof Error) ||
    !('code' in error) ||
    error.code !== 'ENOENT'
  ) {
    throw error;
  }
}

const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
