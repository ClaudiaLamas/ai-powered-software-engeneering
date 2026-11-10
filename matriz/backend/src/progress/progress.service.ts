import { Injectable } from '@nestjs/common';
import type { TaskStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type ProgressDto, progressFrom } from './progress.js';

/**
 * Módulo Progresso (`progress`, architecture.md): conta as tarefas de cada
 * projeto por estado. Não guarda nada; o indicador é calculado em cada pedido
 * (database.md §1).
 */
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** Progresso de cada projeto pedido; um projeto sem tarefas tem tudo a 0. */
  async forProjects(projectIds: string[]): Promise<Map<string, ProgressDto>> {
    const counts = new Map<string, Partial<Record<TaskStatus, number>>>(
      projectIds.map((id) => [id, {}]),
    );
    if (projectIds.length > 0) {
      const groups = await this.prisma.task.groupBy({
        by: ['projectId', 'status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      });
      for (const group of groups) {
        counts.get(group.projectId)![group.status] = group._count._all;
      }
    }
    return new Map(
      [...counts].map(([id, byStatus]) => [id, progressFrom(byStatus)]),
    );
  }

  async forProject(projectId: string): Promise<ProgressDto> {
    return (await this.forProjects([projectId])).get(projectId)!;
  }
}
