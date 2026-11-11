import { charLength, ruleError } from '../common/text-rules.js';

/** Limites de PN15 para os comentários. */
export const COMMENT_BODY_MIN = 1;
export const COMMENT_BODY_MAX = 2000;

/**
 * Texto do comentário (PN15): sem os espaços das pontas, com 1 a 2000
 * caracteres. Em falta, vazio ou só com espaços dá `BODY_INVALID`. Devolve o
 * texto aparado, que é o que fica guardado (decisão interna, 2026-11-11).
 */
export function normalizeCommentBody(body: string | undefined): string {
  const trimmed = (body ?? '').trim();
  const length = charLength(trimmed);
  if (length < COMMENT_BODY_MIN) {
    throw ruleError(
      'BODY_INVALID',
      'body',
      'O comentário não pode estar vazio.',
    );
  }
  if (length > COMMENT_BODY_MAX) {
    throw ruleError(
      'BODY_INVALID',
      'body',
      `O comentário pode ter no máximo ${COMMENT_BODY_MAX} caracteres.`,
    );
  }
  return trimmed;
}
