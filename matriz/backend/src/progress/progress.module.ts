import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service.js';

/** Módulo Progresso (`progress`, architecture.md): sem tabelas próprias. */
@Module({
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
