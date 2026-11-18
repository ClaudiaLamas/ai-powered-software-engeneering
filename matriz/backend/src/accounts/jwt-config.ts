/** Configuração dos JWT (D06), lida das variáveis de ambiente (backend/.env). */

/** Token de injeção do segredo dos JWT. */
export const JWT_SECRET = Symbol('JWT_SECRET');

/** Token de injeção da validade dos JWT, em segundos. */
export const JWT_TTL_SECONDS = Symbol('JWT_TTL_SECONDS');

/** Validade por omissão: 1 hora (D06). */
export const DEFAULT_TOKEN_TTL_SECONDS = 3600;

/** Comprimento mínimo do segredo (`openssl rand -hex 32` dá 64 caracteres). */
export const JWT_SECRET_MIN_LENGTH = 32;

/** Valor de exemplo do backend/.env.example: é público, nunca serve de segredo. */
const EXAMPLE_SECRET = 'muda-este-segredo';

/**
 * Lê JWT_SECRET. A API não arranca sem ele, com o valor de exemplo ou com
 * menos de 32 caracteres: com um segredo conhecido ou fraco, qualquer pessoa
 * pode forjar o token de qualquer conta.
 */
export function jwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Define a variável de ambiente JWT_SECRET (no backend/.env em desenvolvimento, ' +
        'no .env da raiz com Docker Compose; ver .env.example). Gera-a com openssl rand -hex 32.',
    );
  }
  if (secret === EXAMPLE_SECRET) {
    throw new Error(
      'JWT_SECRET tem o valor de exemplo do .env.example. Gera um segredo novo (por exemplo, openssl rand -hex 32).',
    );
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET tem de ter pelo menos ${JWT_SECRET_MIN_LENGTH} caracteres. Gera um segredo novo (por exemplo, openssl rand -hex 32).`,
    );
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
