import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  JWT_SECRET,
  JWT_TTL_SECONDS,
  jwtSecret,
  tokenTtlSeconds,
} from './jwt-config.js';
import { JwtStrategy } from './jwt.strategy.js';

/** Módulo Autenticação e contas (`accounts`, architecture.md). */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        // A validade é dada em cada token pelo AuthService (JWT_EXPIRES_IN_SECONDS).
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: JWT_SECRET, useFactory: () => jwtSecret() },
    { provide: JWT_TTL_SECONDS, useFactory: () => tokenTtlSeconds() },
  ],
  exports: [AuthService],
})
export class AccountsModule {}
