/*
 * Mesmas regras do backend (PN15, backend/src/tasks/comment-rules.ts): o texto
 * conta sem os espaços das pontas e os comprimentos contam pontos de código,
 * como o PostgreSQL. O backend volta a validar.
 */
export const COMMENT_BODY_MAX = 2000

export const COMMENT_EMPTY_MESSAGE = 'O comentário não pode estar vazio.'
export const COMMENT_TOO_LONG_MESSAGE = `O comentário pode ter no máximo ${COMMENT_BODY_MAX} caracteres.`

/** Caracteres que contam para o limite: sem os espaços das pontas. */
export function commentLength(body: string): number {
  return [...body.trim()].length
}

/** Erro do texto de um comentário, ou `null` quando é válido. */
export function validateCommentBody(body: string): string | null {
  const length = commentLength(body)
  if (length === 0) return COMMENT_EMPTY_MESSAGE
  if (length > COMMENT_BODY_MAX) return COMMENT_TOO_LONG_MESSAGE
  return null
}

/** Data e hora em português de Portugal (por exemplo "11/11/2026, 21:59"), no fuso do navegador. */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso))
}
