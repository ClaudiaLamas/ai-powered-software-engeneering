import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/** Lê JWT_SECRET (D06); a API não arranca sem ele. */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Define JWT_SECRET no backend/.env (ver .env.example).');
  }
  return secret;
}

/** Módulo Autenticação e contas (`accounts`, architecture.md). */
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AccountsModule {}
