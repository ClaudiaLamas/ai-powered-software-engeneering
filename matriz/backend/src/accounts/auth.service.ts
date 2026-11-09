import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccountDto, toAccountDto } from './account.dto.js';

/** Validade do JWT: 1 hora (D06). */
export const TOKEN_TTL_SECONDS = 3600;

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
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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
    if (!account?.passwordHash || account.status === 'PENDING') {
      throw invalidCredentials();
    }
    if (!(await bcrypt.compare(password, account.passwordHash))) {
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
      expiresIn: TOKEN_TTL_SECONDS,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: TOKEN_TTL_SECONDS,
      account: toAccountDto(account),
    };
  }
}
