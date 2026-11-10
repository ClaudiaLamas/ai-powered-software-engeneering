import type {
  AccountStatus,
  Prisma,
  TaskPriority,
  TaskStatus,
} from '../generated/prisma/client.js';

/** `Assignee` (openapi.yaml): o responsável, com a indicação "já não é membro" (PN07). */
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
  assignee: AssigneeDto | null;
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

/**
 * Seleção da tarefa com o responsável e a sua participação no projeto da
 * tarefa: `memberships` tem um elemento se ainda for membro, nenhum se não for.
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
    assignee: {
      select: {
        id: true,
        name: true,
        status: true,
        memberships: { where: { projectId }, select: { accountId: true } },
      },
    },
  } satisfies Prisma.TaskSelect;
}

export type TaskRow = Prisma.TaskGetPayload<{
  select: ReturnType<typeof taskSelect>;
}>;

export function toTaskDto(task: TaskRow): TaskDto {
  const { assignee } = task;
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: assignee && {
      id: assignee.id,
      name: assignee.name,
      status: assignee.status,
      isProjectMember: assignee.memberships.length > 0,
    },
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
