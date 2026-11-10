import type { ProblemException } from '../common/problem.js';
import { charLength as length, ruleError } from '../common/text-rules.js';

/** Limites de PN12. */
export const NAME_MIN = 3;
export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 1000;

/**
 * Nome do projeto (PN12): sem os espaços das pontas, com 3 a 100 caracteres.
 * Em falta ou só com espaços também dá `NAME_INVALID`. Devolve o nome aparado,
 * que é o que fica guardado (decisão de 2026-11-09).
 */
export function normalizeName(name: string | undefined): string {
  const trimmed = (name ?? '').trim();
  if (length(trimmed) < NAME_MIN || length(trimmed) > NAME_MAX) {
    throw ruleError(
      'NAME_INVALID',
      'name',
      `O nome é obrigatório e tem de ter entre ${NAME_MIN} e ${NAME_MAX} caracteres.`,
    );
  }
  return trimmed;
}

/**
 * Descrição do projeto (PN12): opcional, até 1000 caracteres. Vazia ou só com
 * espaços fica `null`, "sem descrição" (decisão de 2026-11-09); de resto é
 * guardada como foi escrita.
 */
export function normalizeDescription(
  description: string | null | undefined,
): string | null {
  if (description == null || description.trim() === '') return null;
  if (length(description) > DESCRIPTION_MAX) {
    throw ruleError(
      'DESCRIPTION_TOO_LONG',
      'description',
      `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`,
    );
  }
  return description;
}

/** `MANAGER_REQUIRED` (US03). */
export function managerRequired(): ProblemException {
  return ruleError(
    'MANAGER_REQUIRED',
    'managerId',
    'Escolha o Gestor do projeto.',
  );
}

/** `MANAGER_DEACTIVATED` (US03, PN08). */
export function managerDeactivated(): ProblemException {
  return ruleError(
    'MANAGER_DEACTIVATED',
    'managerId',
    'O Gestor escolhido tem a conta desativada.',
  );
}
