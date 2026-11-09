/** Token de injeção do segredo dos JWT. */
export const JWT_SECRET = Symbol('JWT_SECRET');

/** Lê JWT_SECRET (D06); a API não arranca sem ele. */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Define JWT_SECRET no backend/.env (ver .env.example).');
  }
  return secret;
}
