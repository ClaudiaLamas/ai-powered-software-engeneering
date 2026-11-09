import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { ProblemException } from '../common/problem.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, TOKEN_TTL_SECONDS } from './auth.service.js';

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

function setup(found: ReturnType<typeof account> | null) {
  const findUnique = vi.fn().mockResolvedValue(found);
  const prisma = { account: { findUnique } } as unknown as PrismaService;
  const jwt = new JwtService({ secret: randomUUID() });
  return { service: new AuthService(prisma, jwt), findUnique, jwt };
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
    expect(TOKEN_TTL_SECONDS).toBe(3600);
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
});
