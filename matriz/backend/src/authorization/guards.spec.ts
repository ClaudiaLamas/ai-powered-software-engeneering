import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProblemException } from '../common/problem.js';
import { AdminGuard } from './admin.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC } from './public.decorator.js';

function contextWith(user: unknown): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard (FN02, PN02)', () => {
  const guard = new AdminGuard();

  it('deixa passar uma conta com permissão de Administrador', () => {
    expect(guard.canActivate(contextWith({ id: 'x', isAdmin: true }))).toBe(true);
  });

  it('recusa com 403 NOT_ADMIN uma conta sem a permissão', () => {
    let error: unknown;
    try {
      guard.canActivate(contextWith({ id: 'x', isAdmin: false }));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ProblemException);
    expect(error).toMatchObject({ status: 403, code: 'NOT_ADMIN' });
  });
});

describe('JwtAuthGuard', () => {
  it('deixa passar sem token uma rota marcada com @Public()', async () => {
    const getAllAndOverride = vi.fn().mockReturnValue(true);
    const guard = new JwtAuthGuard({ getAllAndOverride } as unknown as Reflector);
    await expect(guard.canActivate(contextWith(undefined))).resolves.toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC, expect.any(Array));
  });

  it('converte a falta de conta autenticada em 401 UNAUTHENTICATED', () => {
    const guard = new JwtAuthGuard(new Reflector());
    expect(() => guard.handleRequest(null, false)).toThrow(
      expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' }),
    );
  });

  it('mantém o erro da estratégia (por exemplo, conta desativada)', () => {
    const guard = new JwtAuthGuard(new Reflector());
    const fromStrategy = new ProblemException(401, 'UNAUTHENTICATED', 'Não autenticado');
    expect(() => guard.handleRequest(fromStrategy, false)).toThrow(fromStrategy);
  });
});
