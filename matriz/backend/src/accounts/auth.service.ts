import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccountDto, toAccountDto } from './account.dto.js';
import { JWT_TTL_SECONDS } from './jwt-config.js';

/** Custo bcrypt das palavras-passe guardadas (o mesmo do seed). */
const BCRYPT_COST = 12;

/** Conteúdo do JWT: só o identificador da conta (D06). */
export interface JwtPayload {
  sub: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  account: AccountDto;
}

function invalidCredentials(): ProblemException {
  return new ProblemException(
    401,
    'INVALID_CREDENTIALS',
    'Não autenticado',
    'O email ou a palavra-passe estão errados.',
  );
}

@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * Hash de uma palavra-passe aleatória, para comparar quando a conta não
   * existe ou está pendente: o login demora o mesmo e o tempo de resposta não
   * revela se o email existe. Calculado no arranque.
   */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(JWT_TTL_SECONDS) private readonly ttlSeconds: number,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.getDummyHash();
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash(randomUUID(), BCRYPT_COST);
    return this.dummyHash;
  }

  /**
   * Entrada com email e palavra-passe (FN01, US01).
   * - Email desconhecido, conta pendente ou palavra-passe errada:
   *   `401 INVALID_CREDENTIALS`, para não revelar que emails existem (DE15).
   * - Conta desativada: `403 ACCOUNT_DEACTIVATED`, só com a palavra-passe certa.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const account = await this.prisma.account.findUnique({
      where: { email: email.trim() },
    });
    const hasPassword = !!account?.passwordHash && account.status !== 'PENDING';
    const matches = await bcrypt.compare(
      password,
      hasPassword ? account.passwordHash! : await this.getDummyHash(),
    );
    if (!account || !hasPassword || !matches) {
      throw invalidCredentials();
    }
    if (account.status === 'DEACTIVATED') {
      throw new ProblemException(
        403,
        'ACCOUNT_DEACTIVATED',
        'Conta desativada',
        'Esta conta foi desativada.',
      );
    }

    const payload: JwtPayload = { sub: account.id };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.ttlSeconds,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.ttlSeconds,
      account: toAccountDto(account),
    };
  }

  /** A conta autenticada (`GET /me`). O JwtStrategy já confirmou que existe e está ativa. */
  async me(accountId: string): Promise<AccountDto> {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });
    return toAccountDto(account);
  }
}
