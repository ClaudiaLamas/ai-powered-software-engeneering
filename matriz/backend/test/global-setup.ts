import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { assertTestDatabase } from './test-database.js';

/**
 * Antes dos testes de API: aplica as migrations à base de dados de testes
 * (cria-a se não existir) e esvazia todas as tabelas. Nunca toca na base de
 * dados local de desenvolvimento: recusa qualquer nome que não termine em `_test`.
 */
export default async function setup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL dos testes não definida.');
  assertTestDatabase(databaseUrl);

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length > 0) {
      const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
      await client.query(`TRUNCATE ${tables} CASCADE`);
    }
  } finally {
    await client.end();
  }
}
