import { DEFAULT_TOKEN_TTL_SECONDS, tokenTtlSeconds } from './jwt-config.js';

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
