import type { Progress, ProjectRole } from '@/api/types'
import { TASK_STATUS_LABELS } from '@/tasks/task-labels'

/*
 * Textos mostrados para a função na equipa e para o progresso de um projeto
 * (US05, US09, PN13). A API usa sempre os valores técnicos.
 */

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  MANAGER: 'Gestor',
  MEMBER: 'Membro',
}

/** Indicação de um projeto arquivado (CL3, wireframe, ecrã 1). */
export const ARCHIVED_LABEL = 'Arquivado (só de leitura)'

/** Texto quando o projeto não tem tarefas (PN13, CL7). */
export const NO_TASKS_LABEL = 'Sem tarefas'

/** "Por fazer: 1, Em curso: 0, Concluída: 3" (US05, US09). */
export function progressCountsLabel(progress: Progress): string {
  return [
    `${TASK_STATUS_LABELS.TODO}: ${progress.todo}`,
    `${TASK_STATUS_LABELS.IN_PROGRESS}: ${progress.inProgress}`,
    `${TASK_STATUS_LABELS.DONE}: ${progress.done}`,
  ].join(', ')
}

/** "75% concluído", ou "Sem tarefas" sem percentagem (PN13). */
export function progressPercentLabel(progress: Progress): string {
  if (progress.total === 0 || progress.percentDone === null) return NO_TASKS_LABEL
  return `${progress.percentDone}% concluído`
}
