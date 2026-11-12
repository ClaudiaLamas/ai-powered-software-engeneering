import { apiFetch } from '@/api/http'
import type { Project, ProjectSummary, ProjectSummaryList } from '@/api/types'

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

/** O Gestor do projeto pode criar, editar e eliminar tarefas, se o projeto estiver ativo (PN05, PN09). */
export function canManageTasks(project: Project, accountId: string | undefined): boolean {
  return project.status === 'ACTIVE' && project.manager.id === accountId
}
