import { Injectable } from '@nestjs/common';
import type {
  ProjectAccess,
  TaskAccess,
} from '../authorization/authorization.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type TaskDto,
  type TaskPageDto,
  taskSelect,
  toTaskDto,
} from './task.dto.js';
import {
  assigneeNotActive,
  assigneeNotMember,
  normalizeDescription,
  normalizeTitle,
} from './task-rules.js';
import type {
  CreateTaskRequest,
  ListTasksQuery,
  UpdateTaskRequest,
} from './task.requests.js';

/**
 * Módulo Tarefas (`tasks`, architecture.md): criar, listar, consultar, editar
 * e eliminar tarefas (US06, US08, US19, US22, US23).
 *
 * As verificações de acesso (`404` → `403` → `409`) são feitas pelo
 * controlador com o AuthorizationService antes de chamar este serviço; o
 * projeto de uma tarefa vem sempre da própria tarefa, nunca do pedido.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  /**
   * `createProjectTask` (US06, US22): só depois de `requireMember`,
   * `requireManager` e `requireWritable`. Começa sempre em `TODO` (PN10) e,
   * sem prioridade indicada, em `MEDIUM` (PN19).
   */
  async create(
    access: ProjectAccess,
    body: CreateTaskRequest,
  ): Promise<TaskDto> {
    const title = normalizeTitle(body.title);
    const description = normalizeDescription(body.description);
    const assigneeId = body.assigneeId ?? null;
    if (assigneeId) await this.requireAssignable(access.projectId, assigneeId);

    const task = await this.prisma.task.create({
      data: {
        projectId: access.projectId,
        title,
        description,
        ...(body.priority && { priority: body.priority }),
        assigneeId,
      },
      select: taskSelect(access.projectId),
    });
    return toTaskDto(task);
  }

  /**
   * `listProjectTasks` (US08, US23, PN20): só depois de `requireMember`.
   * `total` conta o que corresponde a todos os filtros; `countsByStatus`
   * aplica só o filtro de prioridade.
   */
  async list(
    access: ProjectAccess,
    query: ListTasksQuery,
  ): Promise<TaskPageDto> {
    const { projectId } = access;
    const byPriority: Prisma.TaskWhereInput = {
      projectId,
      ...(query.priority && { priority: query.priority }),
    };
    const where: Prisma.TaskWhereInput = {
      ...byPriority,
      ...(query.status && { status: query.status }),
    };

    const [rows, total, groups] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        select: taskSelect(projectId),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.task.count({ where }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: byPriority,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    const count = (status: string) =>
      groups.find((g) => g.status === status)?._count._all ?? 0;
    return {
      items: rows.map(toTaskDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
      countsByStatus: {
        todo: count('TODO'),
        inProgress: count('IN_PROGRESS'),
        done: count('DONE'),
      },
    };
  }

  /** `getTask` (US19): só depois de `requireTask`. */
  async get(access: TaskAccess): Promise<TaskDto> {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: access.taskId },
      select: taskSelect(access.projectId),
    });
    return toTaskDto(task);
  }

  /**
   * `updateTask` (US06, US22): só depois de `requireTask`, `requireManager` e
   * `requireWritable`. Só muda os campos enviados; o projeto e o estado não
   * mudam por aqui. Um responsável igual ao atual não é verificado outra vez
   * (decisão interna, 2026-11-10).
   */
  async update(access: TaskAccess, body: UpdateTaskRequest): Promise<TaskDto> {
    const data: Prisma.TaskUncheckedUpdateManyInput = {};
    if (body.title !== undefined) data.title = normalizeTitle(body.title);
    if (body.description !== undefined) {
      data.description = normalizeDescription(body.description);
    }
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.assigneeId !== undefined) {
      const current = await this.prisma.task.findUniqueOrThrow({
        where: { id: access.taskId },
        select: { assigneeId: true },
      });
      if (body.assigneeId && body.assigneeId !== current.assigneeId) {
        await this.requireAssignable(access.projectId, body.assigneeId);
      }
      data.assigneeId = body.assigneeId;
    }

    // Só escreve se o projeto ainda estiver ativo no momento da escrita.
    const { count } = await this.prisma.task.updateMany({
      where: { id: access.taskId, project: { status: 'ACTIVE' } },
      data,
    });
    if (count === 0) await this.raiseWriteConflict(access);
    return this.get(access);
  }

  /**
   * `deleteTask` (US06, CL2): só depois de `requireTask`, `requireManager` e
   * `requireWritable`. Os comentários são eliminados em cascata (database.md §4).
   */
  async remove(access: TaskAccess): Promise<void> {
    const { count } = await this.prisma.task.deleteMany({
      where: { id: access.taskId, project: { status: 'ACTIVE' } },
    });
    if (count === 0) await this.raiseWriteConflict(access);
  }

  /**
   * O responsável tem de ser membro do projeto (`ASSIGNEE_NOT_MEMBER`, PN06)
   * com conta ativa (`ASSIGNEE_NOT_ACTIVE`, PN08, DE15). Uma conta que não
   * existe não é membro (pressuposto do contrato).
   */
  private async requireAssignable(projectId: string, accountId: string) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_accountId: { projectId, accountId } },
      select: { account: { select: { status: true } } },
    });
    if (!membership) throw assigneeNotMember();
    if (membership.account.status !== 'ACTIVE') throw assigneeNotActive();
  }

  /**
   * A escrita não aconteceu: outro pedido arquivou o projeto (`409`) ou
   * eliminou a tarefa (`404`) depois das verificações do controlador.
   */
  private async raiseWriteConflict(access: TaskAccess): Promise<never> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: access.projectId },
      select: { status: true },
    });
    this.authz.requireWritable({ ...access, projectStatus: project.status });
    throw new ProblemException(
      404,
      'TASK_NOT_FOUND',
      'Não encontrado',
      'A tarefa não existe.',
    );
  }
}
