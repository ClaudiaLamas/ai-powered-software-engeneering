import { apiFetch } from '@/api/http'
import type { Project } from '@/api/types'

/** `getProject` (US09, US18): qualquer membro; `404` a quem não é membro. */
export function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(projectId)}`)
}

/** O Gestor do projeto pode criar, editar e eliminar tarefas, se o projeto estiver ativo (PN05, PN09). */
export function canManageTasks(project: Project, accountId: string | undefined): boolean {
  return project.status === 'ACTIVE' && project.manager.id === accountId
}
