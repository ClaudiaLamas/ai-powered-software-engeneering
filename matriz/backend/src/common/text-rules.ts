import { ProblemException } from './problem.js';

/** Comprimento em caracteres (pontos de código), como conta o PostgreSQL. */
export function charLength(text: string): number {
  // Pontos de código de propósito: é o que conta o VARCHAR(n) do PostgreSQL.
  // oxlint-disable-next-line typescript/no-misused-spread
  return [...text].length;
}

/** `400` de uma regra (PN12 e afins), com o erro no campo indicado. */
export function ruleError(
  code: string,
  field: string,
  message: string,
): ProblemException {
  return new ProblemException(400, code, 'Dados inválidos', message, {
    errors: [{ field, message }],
  });
}
