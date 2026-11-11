import { apiFetch } from '@/api/http'
import type { Task, TaskPage, TaskPriority, TaskStatus } from '@/api/types'
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

/** `createProjectTask` (US06, US22): só o Gestor. */
export function createTask(projectId: string, values: TaskFormValues): Promise<Task> {
  return apiFetch<Task>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: 'POST',
    body: toTaskPayload(values),
  })
}

/** `getTask` (US19). */
export function getTask(taskId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${encodeURIComponent(taskId)}`)
}

/** `updateTask` (US06, US22): título, descrição e prioridade; o responsável não muda. */
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

/** `deleteTask` (US06): só o Gestor. */
export function deleteTask(taskId: string): Promise<void> {
  return apiFetch<void>(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' })
}
