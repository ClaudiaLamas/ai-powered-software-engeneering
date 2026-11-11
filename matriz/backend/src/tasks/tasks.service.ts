import { Injectable } from '@nestjs/common';
import type {
  ProjectAccess,
  TaskAccess,
} from '../authorization/authorization.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma, ProjectStatus } from '../generated/prisma/client.js';
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
  clearsAssigneeOnStatusChange,
  normalizeDescription,
  normalizeTitle,
} from './task-rules.js';
import type {
  ChangeTaskStatusRequest,
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
 *
 * As escritas correm em `writeInActiveProject`, que volta a ver o estado do
 * projeto com a linha bloqueada: um arquivo feito entretanto dá `409` (PN09).
 */

/** Cliente Prisma dentro de uma transação interativa. */
type Tx = Prisma.TransactionClient;

const taskNotFound = () =>
  new ProblemException(
    404,
    'TASK_NOT_FOUND',
    'Não encontrado',
    'A tarefa não existe.',
  );
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

    const task = await this.writeInActiveProject(access, async (tx) => {
      if (assigneeId) {
        await this.requireAssignable(tx, access.projectId, assigneeId);
      }
      return tx.task.create({
        data: {
          projectId: access.projectId,
          title,
          description,
          ...(body.priority && { priority: body.priority }),
          assigneeId,
        },
        select: taskSelect(access.projectId),
      });
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

    await this.writeInActiveProject(access, async (tx) => {
      if (body.assigneeId !== undefined) {
        const current = await tx.task.findUnique({
          where: { id: access.taskId },
          select: { assigneeId: true },
        });
        if (!current) throw taskNotFound();
        if (body.assigneeId && body.assigneeId !== current.assigneeId) {
          await this.requireAssignable(tx, access.projectId, body.assigneeId);
        }
        data.assigneeId = body.assigneeId;
      }
      const { count } = await tx.task.updateMany({
        where: { id: access.taskId },
        data,
      });
      // Outro pedido eliminou a tarefa depois das verificações do controlador.
      if (count === 0) throw taskNotFound();
    });
    return this.get(access);
  }

  /**
   * `changeTaskStatus` (US07): só depois de `requireTask` e `requireWritable`;
   * qualquer membro. Qualquer estado passa a qualquer outro (PN10). Ao reabrir
   * uma tarefa `DONE` de quem já não é membro ou tem a conta desativada, a
   * tarefa fica "Sem responsável" (PN07, PN08).
   */
  async changeStatus(
    access: TaskAccess,
    body: ChangeTaskStatusRequest,
  ): Promise<TaskDto> {
    await this.writeInActiveProject(access, async (tx) => {
      // Bloqueia a tarefa: dois pedidos ao mesmo tempo veem o estado um do outro.
      const [locked] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM task WHERE id = ${access.taskId}::uuid FOR UPDATE`;
      if (!locked) throw taskNotFound();
      const current = await tx.task.findUniqueOrThrow({
        where: { id: access.taskId },
        select: taskSelect(access.projectId),
      });
      const { assignee } = current;
      const clear = clearsAssigneeOnStatusChange(
        current.status,
        body.status,
        assignee && {
          active: assignee.status === 'ACTIVE',
          isProjectMember: assignee.memberships.length > 0,
        },
      );
      await tx.task.update({
        where: { id: access.taskId },
        data: { status: body.status, ...(clear && { assigneeId: null }) },
      });
    });
    return this.get(access);
  }

  /**
   * `deleteTask` (US06, CL2): só depois de `requireTask`, `requireManager` e
   * `requireWritable`. Os comentários são eliminados em cascata (database.md §4).
   */
  async remove(access: TaskAccess): Promise<void> {
    await this.writeInActiveProject(access, async (tx) => {
      const { count } = await tx.task.deleteMany({
        where: { id: access.taskId },
      });
      if (count === 0) throw taskNotFound();
    });
  }

  /**
   * O responsável tem de ser membro do projeto (`ASSIGNEE_NOT_MEMBER`, PN06)
   * com conta ativa (`ASSIGNEE_NOT_ACTIVE`, PN08, DE15). Uma conta que não
   * existe não é membro (pressuposto do contrato).
   */
  private async requireAssignable(
    tx: Tx,
    projectId: string,
    accountId: string,
  ) {
    const membership = await tx.projectMember.findUnique({
      where: { projectId_accountId: { projectId, accountId } },
      select: { account: { select: { status: true } } },
    });
    if (!membership) throw assigneeNotMember();
    if (membership.account.status !== 'ACTIVE') throw assigneeNotActive();
  }

  /**
   * Corre `write` numa transação com a linha do projeto bloqueada
   * (`FOR SHARE`) e só depois de confirmar que o projeto continua ativo.
   * Arquivar é um `UPDATE` dessa linha, por isso espera pelo fim da escrita,
   * ou a escrita espera pelo arquivo e vê-o: nunca se escreve num projeto
   * arquivado (PN09). O `409` vem antes dos `400` das regras, como no
   * controlador.
   */
  private writeInActiveProject<T>(
    access: ProjectAccess,
    write: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const [project] = await tx.$queryRaw<{ status: ProjectStatus }[]>`
        SELECT status FROM project WHERE id = ${access.projectId}::uuid FOR SHARE`;
      // O projeto não é eliminado no MVP; sem linha, trata-se como só de leitura.
      this.authz.requireWritable({
        ...access,
        projectStatus: project?.status ?? 'ARCHIVED',
      });
      return write(tx);
    });
  }
}
