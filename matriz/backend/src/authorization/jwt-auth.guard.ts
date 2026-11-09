import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { unauthenticated } from '../common/problem.js';
import { IS_PUBLIC } from './public.decorator.js';

/**
 * Guard global: exige um JWT válido (D06) em todas as rotas, exceto as
 * marcadas com @Public(). Sem token, com token inválido ou expirado, ou de uma
 * conta desativada: `401 UNAUTHENTICATED`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return Promise.resolve(true);
    return super.canActivate(context);
  }

  override handleRequest<TUser>(error: unknown, user: TUser | false): TUser {
    if (error) throw error;
    if (!user) throw unauthenticated();
    return user;
  }
}
