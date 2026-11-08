import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Configuração do Prisma 7: a ligação vem de DATABASE_URL (backend/.env, ignorado pelo Git).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Só corre com `prisma db seed` (ou `npm run db:seed`); nunca no arranque da API.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
