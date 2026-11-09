import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { unauthenticated } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedAccount } from '../authorization/authenticated-account.js';
import type { JwtPayload } from './auth.service.js';
import { JWT_SECRET } from './jwt-secret.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida o JWT do cabeçalho `Authorization: Bearer ...` (D06) e lê a conta na
 * base de dados em cada pedido. Recusa contas desativadas mesmo antes de o
 * token expirar (decisão de 2026-11-09).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(JWT_SECRET) secret: string,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedAccount> {
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) {
      throw unauthenticated();
    }
    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, isAdmin: true },
    });
    if (account?.status !== 'ACTIVE') throw unauthenticated();
    return { id: account.id, isAdmin: account.isAdmin };
  }
}
