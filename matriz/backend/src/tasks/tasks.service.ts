import { Injectable } from '@nestjs/common';
import type {
  ProjectAccess,
  TaskAccess,
} from '../authorization/authorization.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ProblemException } from '../common/problem.js';
import { Prisma, type ProjectStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type AccountSummaryDto,
  type TaskDto,
  type TaskPageDto,
  taskSelect,
  toTaskDto,
} from './task.dto.js';
import {
  type AssigneeField,
  assigneeAlreadyAssigned,
  assigneeNotActive,
  assigneeNotFound,
  assigneeNotMember,
  assigneesRemovedOnStatusChange,
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
 * e eliminar tarefas, atribuir e remover responsáveis e listar quem pode ser
 * responsável (US06, US08, US19, US22, US23; DE16).
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

/** `P2002`: o Prisma recusou a escrita por violar uma restrição única. */
const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

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
    const assigneeIds = body.assigneeIds ?? [];

    const task = await this.writeInActiveProject(access, async (tx) => {
      for (const accountId of assigneeIds) {
        await this.requireAssignable(
          tx,
          access.projectId,
          accountId,
          'assigneeIds',
        );
      }
      return tx.task.create({
        data: {
          projectId: access.projectId,
          title,
          description,
          ...(body.priority && { priority: body.priority }),
          assignees: {
            create: assigneeIds.map((accountId) => ({ accountId })),
          },
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
   * `requireWritable`. Só muda os campos enviados; o projeto, o estado e os
   * responsáveis não mudam por aqui.
   */
  async update(access: TaskAccess, body: UpdateTaskRequest): Promise<TaskDto> {
    const data: Prisma.TaskUncheckedUpdateManyInput = {};
    if (body.title !== undefined) data.title = normalizeTitle(body.title);
    if (body.description !== undefined) {
      data.description = normalizeDescription(body.description);
    }
    if (body.priority !== undefined) data.priority = body.priority;

    await this.writeInActiveProject(access, async (tx) => {
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
   * uma tarefa `DONE`, saem dos responsáveis quem já não é membro ou tem a
   * conta desativada; os outros mantêm-se (PN07, PN08, DE16).
   */
  async changeStatus(
    access: TaskAccess,
    body: ChangeTaskStatusRequest,
  ): Promise<TaskDto> {
    await this.writeInActiveProject(access, async (tx) => {
      await this.lockTask(tx, access.taskId);
      const current = await tx.task.findUniqueOrThrow({
        where: { id: access.taskId },
        select: taskSelect(access.projectId),
      });
      const removed = assigneesRemovedOnStatusChange(
        current.status,
        body.status,
        current.assignees.map(({ account }) => ({
          accountId: account.id,
          active: account.status === 'ACTIVE',
          isProjectMember: account.memberships.length > 0,
        })),
      );
      await tx.task.update({
        where: { id: access.taskId },
        data: {
          status: body.status,
          ...(removed.length > 0 && {
            assignees: { deleteMany: { accountId: { in: removed } } },
          }),
        },
      });
    });
    return this.get(access);
  }

  /**
   * `deleteTask` (US06, CL2): só depois de `requireTask`, `requireManager` e
   * `requireWritable`. Os comentários e os responsáveis são eliminados em
   * cascata (database.md §4).
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
   * `addTaskAssignee` (US06, DE16): só depois de `requireTask`,
   * `requireManager` e `requireWritable`. Em qualquer estado da tarefa. Uma
   * conta que já é responsável dá `409` antes das regras de PN06 (por
   * exemplo, quem saiu do projeto numa tarefa `DONE`).
   */
  async addAssignee(access: TaskAccess, accountId: string): Promise<TaskDto> {
    await this.writeInActiveProject(access, async (tx) => {
      // Bloqueia a tarefa: dois pedidos iguais ao mesmo tempo dão um 201 e um 409.
      await this.lockTask(tx, access.taskId);
      const existing = await tx.taskAssignee.findUnique({
        where: { taskId_accountId: { taskId: access.taskId, accountId } },
        select: { accountId: true },
      });
      if (existing) throw assigneeAlreadyAssigned();
      await this.requireAssignable(
        tx,
        access.projectId,
        accountId,
        'accountId',
      );
      try {
        await tx.taskAssignee.create({
          data: { taskId: access.taskId, accountId },
        });
      } catch (error) {
        // Rede de segurança: a chave primária (task_id, account_id) impede o
        // duplicado na base de dados; responde com o código do contrato, não 500.
        if (isUniqueViolation(error)) throw assigneeAlreadyAssigned();
        throw error;
      }
    });
    return this.get(access);
  }

  /**
   * `removeTaskAssignee` (US06, DE14): só depois de `requireTask`,
   * `requireManager` e `requireWritable`. Qualquer responsável, também numa
   * tarefa `DONE` e quem já não é membro; quem não é responsável dá `404`.
   */
  async removeAssignee(access: TaskAccess, accountId: string): Promise<void> {
    await this.writeInActiveProject(access, async (tx) => {
      await this.lockTask(tx, access.taskId);
      const { count } = await tx.taskAssignee.deleteMany({
        where: { taskId: access.taskId, accountId },
      });
      if (count === 0) throw assigneeNotFound();
    });
  }

  /**
   * `listAssignableAccounts` (US06, PN06, PN08, DE15): só depois de
   * `requireMember` e `requireManager`. Membros do projeto com conta ativa,
   * por ordem do nome (e do id, em caso de empate).
   */
  async listAssignable(
    access: ProjectAccess,
  ): Promise<{ items: AccountSummaryDto[] }> {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId: access.projectId, account: { status: 'ACTIVE' } },
      orderBy: [{ account: { name: 'asc' } }, { accountId: 'asc' }],
      select: { account: { select: { id: true, name: true, status: true } } },
    });
    return { items: members.map((m) => m.account) };
  }

  /**
   * Bloqueia a linha da tarefa até ao fim da transação: as escritas na mesma
   * tarefa veem-se umas às outras. Sem linha, a tarefa foi eliminada depois
   * das verificações do controlador.
   */
  private async lockTask(tx: Tx, taskId: string) {
    const [locked] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM task WHERE id = ${taskId}::uuid FOR UPDATE`;
    if (!locked) throw taskNotFound();
  }

  /**
   * O responsável tem de ser membro do projeto (`ASSIGNEE_NOT_MEMBER`, PN06)
   * com conta ativa (`ASSIGNEE_NOT_ACTIVE`, PN08, DE15). Uma conta que não
   * existe não é membro (pressuposto do contrato). `field` é o campo do
   * pedido indicado no erro.
   */
  private async requireAssignable(
    tx: Tx,
    projectId: string,
    accountId: string,
    field: AssigneeField,
  ) {
    const membership = await tx.projectMember.findUnique({
      where: { projectId_accountId: { projectId, accountId } },
      select: { account: { select: { status: true } } },
    });
    if (!membership) throw assigneeNotMember(field);
    if (membership.account.status !== 'ACTIVE') throw assigneeNotActive(field);
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
