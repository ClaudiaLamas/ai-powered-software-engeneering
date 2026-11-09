import { Injectable } from '@nestjs/common';
import { ProblemException } from '../common/problem.js';
import type { ProjectRole, ProjectStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Acesso de uma conta a um projeto onde é membro. */
export interface ProjectAccess {
  projectId: string;
  role: ProjectRole;
  projectStatus: ProjectStatus;
}

/**
 * Responde a "esta conta pode fazer esta ação neste projeto?" (architecture.md).
 * Ordem das verificações: `404` (não é membro) → `403` (função) → `409`
 * (arquivado). A permissão de Administrador não dá acesso ao conteúdo (PN02).
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Membro (Gestor ou Membro) do projeto; caso contrário `404 PROJECT_NOT_FOUND` (RNF02). */
  async requireMember(accountId: string, projectId: string): Promise<ProjectAccess> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_accountId: { projectId, accountId } },
      select: { role: true, project: { select: { status: true } } },
    });
    if (!membership) {
      throw new ProblemException(404, 'PROJECT_NOT_FOUND', 'Não encontrado', 'O projeto não existe.');
    }
    return { projectId, role: membership.role, projectStatus: membership.project.status };
  }

  /** Só o Gestor do projeto (PN05, DE07): `403 NOT_PROJECT_MANAGER`. */
  requireManager(access: ProjectAccess): void {
    if (access.role !== 'MANAGER') {
      throw new ProblemException(
        403,
        'NOT_PROJECT_MANAGER',
        'Sem permissão',
        'Só o Gestor do projeto pode fazer esta ação.',
      );
    }
  }

  /** Escrita só em projetos ativos (PN09): `409 PROJECT_ARCHIVED`. */
  requireWritable(access: ProjectAccess): void {
    if (access.projectStatus === 'ARCHIVED') {
      throw new ProblemException(
        409,
        'PROJECT_ARCHIVED',
        'Projeto arquivado',
        'O projeto está arquivado e não pode ser alterado.',
      );
    }
  }
}
