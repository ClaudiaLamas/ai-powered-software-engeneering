import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JWT_SECRET, jwtSecret } from './jwt-secret.js';
import { JwtStrategy } from './jwt.strategy.js';

/** Módulo Autenticação e contas (`accounts`, architecture.md). */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: JWT_SECRET, useFactory: jwtSecret },
  ],
  exports: [AuthService],
})
export class AccountsModule {}
