import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminGuard } from './admin.guard.js';
import { AuthorizationService } from './authorization.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/** Módulo Autorização (`authorization`, architecture.md): transversal. */
@Global()
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    AdminGuard,
    AuthorizationService,
  ],
  exports: [AdminGuard, AuthorizationService],
})
export class AuthorizationModule {}
