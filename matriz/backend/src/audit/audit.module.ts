import { Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';

/** Módulo Registo administrativo (`audit`, architecture.md). A consulta fica para o incremento 7. */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
