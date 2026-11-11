import type { TaskPriority } from '@/api/types'

/*
 * Mesmas regras do backend (PN12, backend/src/tasks/task-rules.ts): o título
 * conta sem os espaços das pontas; os comprimentos contam pontos de código,
 * como o PostgreSQL. O backend volta a validar.
 */
export const TITLE_MIN = 3
export const TITLE_MAX = 150
export const DESCRIPTION_MAX = 2000

export const TITLE_MESSAGE = `O título é obrigatório e tem de ter entre ${TITLE_MIN} e ${TITLE_MAX} caracteres.`
export const DESCRIPTION_MESSAGE = `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`

export interface TaskFormValues {
  title: string
  description: string
  priority: TaskPriority
}

export interface TaskFormErrors {
  title?: string
  description?: string
}

function charLength(text: string): number {
  return [...text].length
}

/** Erros por campo do formulário de tarefa; vazio quando é válido. */
export function validateTask(values: Pick<TaskFormValues, 'title' | 'description'>): TaskFormErrors {
  const errors: TaskFormErrors = {}
  const title = charLength(values.title.trim())
  if (title < TITLE_MIN || title > TITLE_MAX) errors.title = TITLE_MESSAGE
  if (values.description.trim() !== '' && charLength(values.description) > DESCRIPTION_MAX) {
    errors.description = DESCRIPTION_MESSAGE
  }
  return errors
}

/** Corpo do pedido: título aparado e descrição vazia como `null` (PN12). */
export function toTaskPayload(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim() === '' ? null : values.description,
    priority: values.priority,
  }
}
