import { apiFetch } from '@/api/http'
import type { Project, ProjectSummary, ProjectSummaryList } from '@/api/types'
import { type ProjectFormValues, toProjectPayload } from './project-validation'

/**
 * `listMyProjects` (US05): projetos onde a conta é Gestor ou Membro, com o
 * progresso calculado no servidor sobre todas as tarefas (PN02, PN13).
 */
export async function listMyProjects(): Promise<ProjectSummary[]> {
  return (await apiFetch<ProjectSummaryList>('/projects')).items
}

/** `getProject` (US09, US18): qualquer membro; `404` a quem não é membro. */
export function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(projectId)}`)
}

/** `updateProject` (US10): só o Gestor, num projeto ativo; nome e descrição. */
export function updateProject(projectId: string, values: ProjectFormValues): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: toProjectPayload(values),
  })
}

/** `archiveProject` (US10): só o Gestor; o projeto fica só de leitura (PN09). */
export function archiveProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${encodeURIComponent(projectId)}/archive`, { method: 'POST' })
}

/** O Gestor do projeto pode criar, editar e eliminar tarefas, se o projeto estiver ativo (PN05, PN09). */
export function canManageTasks(project: Project, accountId: string | undefined): boolean {
  return project.status === 'ACTIVE' && project.manager.id === accountId
}
