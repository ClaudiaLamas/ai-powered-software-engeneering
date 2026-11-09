/** Configuração dos JWT (D06), lida das variáveis de ambiente (backend/.env). */

/** Token de injeção do segredo dos JWT. */
export const JWT_SECRET = Symbol('JWT_SECRET');

/** Token de injeção da validade dos JWT, em segundos. */
export const JWT_TTL_SECONDS = Symbol('JWT_TTL_SECONDS');

/** Validade por omissão: 1 hora (D06). */
export const DEFAULT_TOKEN_TTL_SECONDS = 3600;

/** Lê JWT_SECRET; a API não arranca sem ele. */
export function jwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('Define JWT_SECRET no backend/.env (ver .env.example).');
  }
  return secret;
}

/**
 * Lê JWT_EXPIRES_IN_SECONDS (um número inteiro positivo de segundos). Sem a
 * variável, usa 1 hora (D06). Um valor inválido impede a API de arrancar.
 */
export function tokenTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.JWT_EXPIRES_IN_SECONDS;
  if (raw === undefined || raw === '') return DEFAULT_TOKEN_TTL_SECONDS;
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    throw new Error(
      `JWT_EXPIRES_IN_SECONDS tem de ser um número inteiro positivo de segundos (recebido: "${raw}").`,
    );
  }
  return Number(raw);
}
