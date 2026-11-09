import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { ProblemException } from '../common/problem.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

// Palavra-passe fictícia, gerada para cada execução dos testes.
const PASSWORD = `pw-${randomUUID()}`;
const HASH = bcrypt.hashSync(PASSWORD, 4);

type Status = 'PENDING' | 'ACTIVE' | 'DEACTIVATED';

function account(status: Status, passwordHash: string | null = HASH) {
  return {
    id: randomUUID(),
    name: 'Ana Teste',
    email: 'ana@exemplo.test',
    passwordHash,
    status,
    isAdmin: false,
    isSystemAccount: false,
    createdAt: new Date('2026-11-01T10:00:00Z'),
  };
}

function setup(found: ReturnType<typeof account> | null, ttlSeconds = 3600) {
  const findUnique = vi.fn().mockResolvedValue(found);
  const prisma = { account: { findUnique } } as unknown as PrismaService;
  const jwt = new JwtService({ secret: randomUUID() });
  return { service: new AuthService(prisma, jwt, ttlSeconds), findUnique, jwt };
}

async function expectProblem(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemException);
  expect(error).toMatchObject({ status, code });
}

describe('AuthService.login (US01, D06)', () => {
  it('devolve um JWT com só o sub, válido 1 hora, e a conta sem o hash', async () => {
    const ana = account('ACTIVE');
    const { service, jwt } = setup(ana);

    const result = await service.login(ana.email, PASSWORD);

    expect(result).toMatchObject({ tokenType: 'Bearer', expiresIn: 3600 });
    const payload = await jwt.verifyAsync<Record<string, unknown>>(result.accessToken);
    expect(payload.sub).toBe(ana.id);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(Number(payload.exp) - Number(payload.iat)).toBe(3600);
    expect(result.account).toEqual({
      id: ana.id,
      name: ana.name,
      email: ana.email,
      status: 'ACTIVE',
      isAdmin: false,
      isSystemAccount: false,
      createdAt: '2026-11-01T10:00:00.000Z',
    });
  });

  it('procura a conta pelo email sem espaços nas pontas', async () => {
    const { service, findUnique } = setup(account('ACTIVE'));
    await service.login('  ana@exemplo.test ', PASSWORD);
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'ana@exemplo.test' } });
  });

  it('recusa com 401 INVALID_CREDENTIALS uma palavra-passe errada', async () => {
    const { service } = setup(account('ACTIVE'));
    await expectProblem(service.login('ana@exemplo.test', `${PASSWORD}x`), 401, 'INVALID_CREDENTIALS');
  });

  it('recusa com 401 INVALID_CREDENTIALS um email que não existe', async () => {
    const { service } = setup(null);
    await expectProblem(service.login('ninguem@exemplo.test', PASSWORD), 401, 'INVALID_CREDENTIALS');
  });

  it('recusa uma conta pendente com a mesma resposta que credenciais erradas (DE15)', async () => {
    const { service } = setup(account('PENDING', null));
    await expectProblem(service.login('ana@exemplo.test', PASSWORD), 401, 'INVALID_CREDENTIALS');
  });

  it('recusa com 403 ACCOUNT_DEACTIVATED uma conta desativada com a palavra-passe certa', async () => {
    const { service } = setup(account('DEACTIVATED'));
    await expectProblem(service.login('ana@exemplo.test', PASSWORD), 403, 'ACCOUNT_DEACTIVATED');
  });

  it('recusa com 401 uma conta desativada com a palavra-passe errada (não revela o estado)', async () => {
    const { service } = setup(account('DEACTIVATED'));
    await expectProblem(service.login('ana@exemplo.test', 'errada-errada'), 401, 'INVALID_CREDENTIALS');
  });

  it('usa a validade configurada (JWT_EXPIRES_IN_SECONDS) no token e em expiresIn', async () => {
    const ana = account('ACTIVE');
    const { service, jwt } = setup(ana, 900);

    const result = await service.login(ana.email, PASSWORD);

    expect(result.expiresIn).toBe(900);
    const payload = await jwt.verifyAsync<{ iat: number; exp: number }>(result.accessToken);
    expect(payload.exp - payload.iat).toBe(900);
  });

  it.each([
    ['email desconhecido', null],
    ['conta pendente', account('PENDING', null)],
  ])('com %s também compara a palavra-passe com um hash, para o tempo de resposta não revelar o email', async (_, found) => {
    const compare = vi.spyOn(bcrypt, 'compare');
    const { service } = setup(found);

    await expectProblem(service.login('x@exemplo.test', PASSWORD), 401, 'INVALID_CREDENTIALS');

    expect(compare).toHaveBeenCalledOnce();
    compare.mockRestore();
  });
});

describe('AuthService.onModuleInit', () => {
  it('calcula o hash fictício no arranque, e os logins seguintes já não o calculam', async () => {
    const prisma = { account: { findUnique: vi.fn().mockResolvedValue(null) } } as unknown as PrismaService;
    const service = new AuthService(prisma, new JwtService({ secret: randomUUID() }), 3600);
    const hash = vi.spyOn(bcrypt, 'hash');

    await service.onModuleInit();
    expect(hash).toHaveBeenCalledOnce();

    await service.login('ninguem@exemplo.test', 'x').catch(() => undefined);
    expect(hash).toHaveBeenCalledOnce();
    hash.mockRestore();
  });
});
