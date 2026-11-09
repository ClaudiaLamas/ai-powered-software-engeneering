import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../authorization/public.decorator.js';
import { AuthService, LoginResponse } from './auth.service.js';
import { LoginRequest } from './login.request.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** `POST /auth/login` (FN01, US01). */
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginRequest): Promise<LoginResponse> {
    return this.auth.login(body.email, body.password);
  }
}
