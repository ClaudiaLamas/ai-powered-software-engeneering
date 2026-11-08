import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Configuração do Prisma 7: a ligação vem de DATABASE_URL (backend/.env, ignorado pelo Git).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
