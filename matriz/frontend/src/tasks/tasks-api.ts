import { apiFetch } from '@/api/http'
import type {
  AccountSummary,
  Comment,
  Task,
  TaskPage,
  TaskPriority,
  TaskStatus,
} from '@/api/types'
import type { TaskFormValues } from './task-validation'
import { toTaskPayload } from './task-validation'

export interface TaskListQuery {
  status?: TaskStatus
  priority?: TaskPriority
  page?: number
  pageSize?: number
}

/** `listProjectTasks` (US08, US23): uma página, com `total` e `countsByStatus`. */
export function listProjectTasks(projectId: string, query: TaskListQuery = {}): Promise<TaskPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const qs = params.toString()
  return apiFetch<TaskPage>(`/projects/${encodeURIComponent(projectId)}/tasks${qs ? `?${qs}` : ''}`)
}

/** `createProjectTask` (US06, US22): só o Gestor; com os responsáveis escolhidos (DE16). */
export function createTask(projectId: string, values: TaskFormValues): Promise<Task> {
  const assigneeIds = values.assigneeIds ?? []
  return apiFetch<Task>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: 'POST',
    body: { ...toTaskPayload(values), ...(assigneeIds.length > 0 && { assigneeIds }) },
  })
}

/** `getTask` (US19). */
export function getTask(taskId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${encodeURIComponent(taskId)}`)
}

/** `updateTask` (US06, US22): título, descrição e prioridade; os responsáveis não mudam. */
export function updateTask(taskId: string, values: TaskFormValues): Promise<Task> {
  return apiFetch<Task>(`/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: toTaskPayload(values),
  })
}

/** `changeTaskStatus` (US07): qualquer membro. */
export function changeTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  return apiFetch<Task>(`/tasks/${encodeURIComponent(taskId)}/status`, {
    method: 'PUT',
    body: { status },
  })
}

/** `listAssignableAccounts` (US06): só o Gestor; membros com conta ativa, por ordem do nome. */
export async function listAssignableAccounts(projectId: string): Promise<AccountSummary[]> {
  const res = await apiFetch<{ items: AccountSummary[] }>(
    `/projects/${encodeURIComponent(projectId)}/assignable-accounts`,
  )
  return res.items
}

/** `addTaskAssignee` (US06, DE16): só o Gestor; devolve a tarefa com os responsáveis. */
export function addTaskAssignee(taskId: string, accountId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${encodeURIComponent(taskId)}/assignees`, {
    method: 'POST',
    body: { accountId },
  })
}

/** `removeTaskAssignee` (US06): só o Gestor. */
export function removeTaskAssignee(taskId: string, accountId: string): Promise<void> {
  return apiFetch<void>(
    `/tasks/${encodeURIComponent(taskId)}/assignees/${encodeURIComponent(accountId)}`,
    { method: 'DELETE' },
  )
}

/** `deleteTask` (US06): só o Gestor. */
export function deleteTask(taskId: string): Promise<void> {
  return apiFetch<void>(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' })
}

/** `listTaskComments` (US19): qualquer membro; do mais antigo para o mais recente. */
export async function listTaskComments(taskId: string): Promise<Comment[]> {
  const res = await apiFetch<{ items: Comment[] }>(`/tasks/${encodeURIComponent(taskId)}/comments`)
  return res.items
}

/** `createTaskComment` (US13, PN15): qualquer membro; o autor e a data vêm do backend. */
export function createTaskComment(taskId: string, body: string): Promise<Comment> {
  return apiFetch<Comment>(`/tasks/${encodeURIComponent(taskId)}/comments`, {
    method: 'POST',
    body: { body: body.trim() },
  })
}

/** `updateComment` (US13, PN15): só o autor; devolve o comentário com `editedAt`. */
export function updateComment(commentId: string, body: string): Promise<Comment> {
  return apiFetch<Comment>(`/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    body: { body: body.trim() },
  })
}

/** `deleteComment` (US13, PN15): só o autor. */
export function deleteComment(commentId: string): Promise<void> {
  return apiFetch<void>(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
}
