import { randomUUID } from 'node:crypto';
import { ProblemException } from '../common/problem.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { JwtStrategy } from './jwt.strategy.js';

function strategyFor(found: { id: string; status: string; isAdmin: boolean } | null) {
  const findUnique = vi.fn().mockResolvedValue(found);
  const prisma = { account: { findUnique } } as unknown as PrismaService;
  return { strategy: new JwtStrategy(prisma, randomUUID()), findUnique };
}

describe('JwtStrategy.validate (D06)', () => {
  it('lê a conta na base de dados e devolve o id e a permissão de Administrador atuais', async () => {
    const id = randomUUID();
    const { strategy, findUnique } = strategyFor({ id, status: 'ACTIVE', isAdmin: true });

    await expect(strategy.validate({ sub: id })).resolves.toEqual({ id, isAdmin: true });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id },
      select: { id: true, status: true, isAdmin: true },
    });
  });

  it.each([
    ['desativada', { status: 'DEACTIVATED' }],
    ['pendente', { status: 'PENDING' }],
    ['inexistente', null],
  ])('recusa com 401 UNAUTHENTICATED o token de uma conta %s', async (_, found) => {
    const id = randomUUID();
    const { strategy } = strategyFor(found && { id, isAdmin: false, ...found });

    const error = await strategy.validate({ sub: id }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemException);
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('recusa um sub que não é um UUID sem consultar a base de dados', async () => {
    const { strategy, findUnique } = strategyFor(null);
    await expect(strategy.validate({ sub: 'nao-e-uuid' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
