import type {
  AccountStatus,
  Prisma,
  TaskPriority,
  TaskStatus,
} from '../generated/prisma/client.js';

/** `Assignee` (openapi.yaml): um responsável, com a indicação "já não é membro" (PN07). */
export interface AssigneeDto {
  id: string;
  name: string;
  status: AccountStatus;
  isProjectMember: boolean;
}

/** `Task` (openapi.yaml). */
export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** Por ordem do nome (DE16); vazia = "Sem responsável". */
  assignees: AssigneeDto[];
  createdAt: string;
  updatedAt: string;
}

/** `TaskCountsByStatus` (openapi.yaml). */
export interface TaskCountsByStatusDto {
  todo: number;
  inProgress: number;
  done: number;
}

/** `TaskPage` (openapi.yaml): uma página das tarefas de um projeto (PN20). */
export interface TaskPageDto {
  items: TaskDto[];
  total: number;
  page: number;
  pageSize: number;
  countsByStatus: TaskCountsByStatusDto;
}

/** `AccountSummary` (openapi.yaml), em `listAssignableAccounts`. */
export interface AccountSummaryDto {
  id: string;
  name: string;
  status: AccountStatus;
}

/**
 * Seleção da tarefa com os responsáveis, por ordem do nome (e do id, em caso
 * de empate), e a participação de cada um no projeto da tarefa:
 * `memberships` tem um elemento se ainda for membro, nenhum se não for.
 */
export function taskSelect(projectId: string) {
  return {
    id: true,
    projectId: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    createdAt: true,
    updatedAt: true,
    assignees: {
      orderBy: [{ account: { name: 'asc' } }, { accountId: 'asc' }],
      select: {
        account: {
          select: {
            id: true,
            name: true,
            status: true,
            memberships: { where: { projectId }, select: { accountId: true } },
          },
        },
      },
    },
  } satisfies Prisma.TaskSelect;
}

export type TaskRow = Prisma.TaskGetPayload<{
  select: ReturnType<typeof taskSelect>;
}>;

export function toTaskDto(task: TaskRow): TaskDto {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignees: task.assignees.map(({ account }) => ({
      id: account.id,
      name: account.name,
      status: account.status,
      isProjectMember: account.memberships.length > 0,
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
