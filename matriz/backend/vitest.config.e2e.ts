import { randomBytes } from 'node:crypto';
import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/test-database.js';

// Carrega backend/.env, se existir; as variáveis do ambiente têm prioridade.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: usam-se só as variáveis do ambiente.
}

// Os testes de API usam uma base de dados própria (`<nome>_test`), recriada
// pelas migrations antes de cada execução (test/global-setup.ts).
process.env.DATABASE_URL = testDatabaseUrl(process.env);
// Segredo próprio e aleatório em cada execução: os testes nunca usam o
// JWT_SECRET do backend/.env, que a API recusa se for o valor de exemplo.
process.env.JWT_SECRET = randomBytes(32).toString('hex');

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Os ficheiros partilham a mesma base de dados: correm um de cada vez.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
    },
  },
});
