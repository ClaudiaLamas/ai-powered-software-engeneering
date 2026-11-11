import type { AccountSummary, Assignee, TaskCountsByStatus, TaskPriority, TaskStatus } from '@/api/types'

/*
 * Único sítio com o texto mostrado para os estados e as prioridades das
 * tarefas (database.md, openapi.yaml). A API usa sempre os valores técnicos.
 */

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Por fazer',
  IN_PROGRESS: 'Em curso',
  DONE: 'Concluída',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
}

/** Ordem dos grupos e das opções (R8). */
export const TASK_STATUSES: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']
export const TASK_PRIORITIES: readonly TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH']

/** Prioridade de uma tarefa nova quando não se escolhe outra (US22). */
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'MEDIUM'

export interface Option<T extends string> {
  value: T
  label: string
}

export const TASK_STATUS_OPTIONS: Option<TaskStatus>[] = TASK_STATUSES.map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value],
}))

export const TASK_PRIORITY_OPTIONS: Option<TaskPriority>[] = TASK_PRIORITIES.map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}))

/** Campo de `countsByStatus` correspondente a cada estado. */
export const COUNT_KEY: Record<TaskStatus, keyof TaskCountsByStatus> = {
  TODO: 'todo',
  IN_PROGRESS: 'inProgress',
  DONE: 'done',
}

/** Texto quando a tarefa não tem responsáveis (PN06). */
export const NO_ASSIGNEE_LABEL = 'Sem responsável'

/**
 * Texto de um responsável (DE14): o nome, com "conta desativada" (que tem
 * precedência) ou "já não é membro".
 */
export function assigneeLabel(assignee: Assignee): string {
  if (assignee.status === 'DEACTIVATED') return `${assignee.name} (conta desativada)`
  if (!assignee.isProjectMember) return `${assignee.name} (já não é membro)`
  return assignee.name
}

/** Nome de uma conta, com "conta desativada" quando é o caso (por exemplo, o autor de um comentário, CL12). */
export function accountLabel(account: AccountSummary): string {
  return account.status === 'DEACTIVATED' ? `${account.name} (conta desativada)` : account.name
}

/** Texto dos responsáveis de uma tarefa (DE16), pela ordem da API (do nome). */
export function assigneesLabel(assignees: readonly Assignee[]): string {
  if (assignees.length === 0) return NO_ASSIGNEE_LABEL
  return assignees.map(assigneeLabel).join(', ')
}
