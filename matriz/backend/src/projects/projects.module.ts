import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

/** Módulo Projetos e membros (`projects`, architecture.md). */
@Module({
  imports: [ProgressModule, AuditModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
