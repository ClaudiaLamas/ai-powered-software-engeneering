import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  type AuthenticatedAccount,
  CurrentAccount,
} from '../authorization/authenticated-account.js';
import { Public } from '../authorization/public.decorator.js';
import type { AccountDto } from './account.dto.js';
import { AuthService, LoginResponse } from './auth.service.js';
import { LoginRequest } from './login.request.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** `POST /auth/login` (FN01, US01). */
  @Public()
  @Post('auth/login')
  @HttpCode(200)
  login(@Body() body: LoginRequest): Promise<LoginResponse> {
    return this.auth.login(body.email, body.password);
  }

  /**
   * `POST /auth/logout` (US15). O backend não revoga o token (D06): o frontend
   * apaga-o e volta ao ecrã de entrada. Só confirma que o pedido tem sessão.
   */
  @Post('auth/logout')
  @HttpCode(204)
  logout(): void {}

  /** `GET /me` (FN01): a conta autenticada. */
  @Get('me')
  me(@CurrentAccount() account: AuthenticatedAccount): Promise<AccountDto> {
    return this.auth.me(account.id);
  }
}
