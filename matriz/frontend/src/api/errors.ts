import { ApiError } from './http'

export const SERVER_UNAVAILABLE = 'Não foi possível contactar o servidor. Tente outra vez.'

/** Mensagens para os códigos estáveis da API (openapi.yaml). */
const MESSAGES: Record<string, string> = {
  PROJECT_ARCHIVED: 'O projeto está arquivado e não pode ser alterado.',
  NOT_PROJECT_MANAGER: 'Só o Gestor do projeto pode fazer esta alteração.',
  TASK_NOT_FOUND: 'A tarefa não existe ou não tem acesso a ela.',
  PROJECT_NOT_FOUND: 'O projeto não existe ou não tem acesso a ele.',
}

/** Mensagem para mostrar a partir de um erro de um pedido à API. */
export function apiErrorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError) || e.status >= 500) return SERVER_UNAVAILABLE
  return MESSAGES[e.code] ?? e.detail ?? fallback
}

/** Erros por campo devolvidos pela API (`errors[]` do Problem Details). */
export function apiFieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !e.errors) return {}
  return Object.fromEntries(e.errors.map((err) => [err.field, err.message]))
}
