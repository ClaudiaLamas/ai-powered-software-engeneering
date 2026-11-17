import { randomBytes } from 'node:crypto';
import {
  DEFAULT_TOKEN_TTL_SECONDS,
  jwtSecret,
  tokenTtlSeconds,
} from './jwt-config.js';

describe('jwtSecret (JWT_SECRET, D06)', () => {
  it('recusa a falta do segredo e não deixa a API arrancar', () => {
    expect(() => jwtSecret({})).toThrow(/JWT_SECRET/);
    expect(() => jwtSecret({ JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
  });

  // Regressão do S1 (docs/quality-security-review.md): o valor do
  // .env.example é público; quem o conhece forja tokens de qualquer conta.
  it('recusa o valor de exemplo do .env.example', () => {
    expect(() => jwtSecret({ JWT_SECRET: 'muda-este-segredo' })).toThrow(/JWT_SECRET/);
  });

  it('recusa um segredo com menos de 32 caracteres', () => {
    expect(() => jwtSecret({ JWT_SECRET: 'a'.repeat(31) })).toThrow(/32 caracteres/);
  });

  it('aceita um segredo aleatório e longo', () => {
    const secret = randomBytes(32).toString('hex');
    expect(jwtSecret({ JWT_SECRET: secret })).toBe(secret);
  });
});

describe('tokenTtlSeconds (JWT_EXPIRES_IN_SECONDS, D06)', () => {
  it('por omissão, 1 hora (D06)', () => {
    expect(DEFAULT_TOKEN_TTL_SECONDS).toBe(3600);
    expect(tokenTtlSeconds({})).toBe(3600);
  });

  it('lê um número inteiro de segundos', () => {
    expect(tokenTtlSeconds({ JWT_EXPIRES_IN_SECONDS: '900' })).toBe(900);
  });

  it.each(['abc', '0', '-60', '1.5', '1h'])('recusa o valor "%s" e não deixa a API arrancar', (value) => {
    expect(() => tokenTtlSeconds({ JWT_EXPIRES_IN_SECONDS: value })).toThrow(/JWT_EXPIRES_IN_SECONDS/);
  });
});
