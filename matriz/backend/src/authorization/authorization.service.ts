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

/** Acesso a uma tarefa: o acesso ao projeto da tarefa. */
export interface TaskAccess extends ProjectAccess {
  taskId: string;
}

/** Acesso a um comentário: o acesso ao projeto da tarefa, mais o autor. */
export interface CommentAccess extends ProjectAccess {
  commentId: string;
  taskId: string;
  authorId: string;
}

function notFound(code: string, detail: string): ProblemException {
  return new ProblemException(404, code, 'Não encontrado', detail);
}

/** Projeto com a função da conta: `members` tem um elemento se for membro, nenhum se não for. */
interface ProjectWithMembership {
  status: ProjectStatus;
  members: { role: ProjectRole }[];
}

/** Seleção do Prisma que traz o estado do projeto e a função de uma conta nele. */
function projectWithMembershipOf(accountId: string) {
  return {
    select: {
      status: true,
      members: { where: { accountId }, select: { role: true } },
    },
  } as const;
}

/**
 * Responde a "esta conta pode fazer esta ação neste projeto?" (architecture.md
 * §4.2). Cada operação de um projeto, tarefa ou comentário chama-o no início,
 * com a conta do token (`@CurrentAccount()`), nunca com um identificador vindo
 * do pedido.
 *
 * Ordem das verificações (openapi.yaml): `404` (não existe ou a conta não é
 * membro) → `403` (função no projeto ou autoria) → `409` (arquivado). A
 * permissão de Administrador não dá acesso ao conteúdo dos projetos (PN02).
 *
 * As verificações ficam no serviço, chamado no controlador, e não num guard:
 * os guards correm antes da validação do pedido, e o contrato pede o `400` de
 * formato antes do `404`.
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Membro (Gestor ou Membro) do projeto; caso contrário `404 PROJECT_NOT_FOUND` (RNF02). */
  async requireMember(
    accountId: string,
    projectId: string,
  ): Promise<ProjectAccess> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_accountId: { projectId, accountId } },
      select: { role: true, project: { select: { status: true } } },
    });
    if (!membership) {
      throw notFound('PROJECT_NOT_FOUND', 'O projeto não existe.');
    }
    return {
      projectId,
      role: membership.role,
      projectStatus: membership.project.status,
    };
  }

  /**
   * Membro do projeto da tarefa; caso contrário `404 TASK_NOT_FOUND`, igual a
   * uma tarefa que não existe. Serve também para as atribuições, que são
   * alterações à tarefa.
   */
  async requireTask(accountId: string, taskId: string): Promise<TaskAccess> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, project: projectWithMembershipOf(accountId) },
    });
    const access = task && membershipIn(task.projectId, task.project);
    if (!access) throw notFound('TASK_NOT_FOUND', 'A tarefa não existe.');
    return { taskId, ...access };
  }

  /**
   * Membro do projeto da tarefa do comentário; caso contrário
   * `404 COMMENT_NOT_FOUND`, igual a um comentário que não existe.
   */
  async requireComment(
    accountId: string,
    commentId: string,
  ): Promise<CommentAccess> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        taskId: true,
        task: {
          select: {
            projectId: true,
            project: projectWithMembershipOf(accountId),
          },
        },
      },
    });
    const access =
      comment && membershipIn(comment.task.projectId, comment.task.project);
    if (!access)
      throw notFound('COMMENT_NOT_FOUND', 'O comentário não existe.');
    return {
      commentId,
      taskId: comment.taskId,
      authorId: comment.authorId,
      ...access,
    };
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

  /** Só o autor do comentário, mesmo que outra conta seja Gestor (PN15): `403 NOT_COMMENT_AUTHOR`. */
  requireCommentAuthor(accountId: string, comment: CommentAccess): void {
    if (comment.authorId !== accountId) {
      throw new ProblemException(
        403,
        'NOT_COMMENT_AUTHOR',
        'Sem permissão',
        'Só o autor pode alterar este comentário.',
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

function membershipIn(
  projectId: string,
  project: ProjectWithMembership,
): ProjectAccess | null {
  const [membership] = project.members;
  return membership
    ? { projectId, role: membership.role, projectStatus: project.status }
    : null;
}
