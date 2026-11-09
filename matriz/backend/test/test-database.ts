/**
 * Base de dados dos testes de API: a mesma ligação de DATABASE_URL, mas com o
 * nome da base de dados terminado em `_test` (por exemplo, `matriz_test`).
 * TEST_DATABASE_URL, se estiver definida, tem prioridade.
 */
export function testDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const explicit = env.TEST_DATABASE_URL;
  if (explicit) {
    assertTestDatabase(explicit);
    return explicit;
  }
  if (!env.DATABASE_URL) {
    throw new Error('Define DATABASE_URL (ou TEST_DATABASE_URL) no backend/.env.');
  }
  const url = new URL(env.DATABASE_URL);
  url.pathname = `${url.pathname.replace(/\/$/, '')}_test`;
  return url.toString();
}

/** Recusa qualquer base de dados cujo nome não termine em `_test`. */
export function assertTestDatabase(databaseUrl: string): void {
  const name = new URL(databaseUrl).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(
      `A base de dados dos testes tem de terminar em "_test" (recebido: "${name}").`,
    );
  }
}
