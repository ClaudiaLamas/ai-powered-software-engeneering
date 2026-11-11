import { charLength, ruleError } from '../common/text-rules.js';
import type { TaskStatus } from '../generated/prisma/client.js';

/** Limites de PN12 para as tarefas. */
export const TITLE_MIN = 3;
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 2000;

/**
 * Título da tarefa (PN12): sem os espaços das pontas, com 3 a 150 caracteres.
 * Em falta ou só com espaços também dá `TITLE_INVALID`. Devolve o título
 * aparado, que é o que fica guardado (decisão interna, 2026-11-10).
 */
export function normalizeTitle(title: string | undefined): string {
  const trimmed = (title ?? '').trim();
  const length = charLength(trimmed);
  if (length < TITLE_MIN || length > TITLE_MAX) {
    throw ruleError(
      'TITLE_INVALID',
      'title',
      `O título é obrigatório e tem de ter entre ${TITLE_MIN} e ${TITLE_MAX} caracteres.`,
    );
  }
  return trimmed;
}

/**
 * Descrição da tarefa (PN12): opcional, até 2000 caracteres. Vazia ou só com
 * espaços fica `null`, "sem descrição" (decisão interna, 2026-11-10); de resto
 * é guardada como foi escrita.
 */
export function normalizeDescription(
  description: string | null | undefined,
): string | null {
  if (description == null || description.trim() === '') return null;
  if (charLength(description) > DESCRIPTION_MAX) {
    throw ruleError(
      'DESCRIPTION_TOO_LONG',
      'description',
      `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`,
    );
  }
  return description;
}

/** `ASSIGNEE_NOT_MEMBER` (PN06): o responsável não é membro do projeto. */
export function assigneeNotMember() {
  return ruleError(
    'ASSIGNEE_NOT_MEMBER',
    'assigneeId',
    'O responsável tem de ser membro do projeto.',
  );
}

/** `ASSIGNEE_NOT_ACTIVE` (PN08, DE15): o responsável tem a conta pendente ou desativada. */
export function assigneeNotActive() {
  return ruleError(
    'ASSIGNEE_NOT_ACTIVE',
    'assigneeId',
    'O responsável tem de ter a conta ativa.',
  );
}

/** Responsável visto pela regra de reabertura (PN07, PN08). */
export interface AssigneeStanding {
  /** A conta está ativa. */
  active: boolean;
  /** A conta é membro do projeto da tarefa. */
  isProjectMember: boolean;
}

/**
 * Reabrir (PN10, DE14): uma tarefa que sai de `DONE` fica "Sem responsável"
 * quando o responsável já não é membro do projeto (PN07) ou tem a conta
 * desativada (PN08). Nos outros casos o responsável mantém-se.
 */
export function clearsAssigneeOnStatusChange(
  from: TaskStatus,
  to: TaskStatus,
  assignee: AssigneeStanding | null,
): boolean {
  if (from !== 'DONE' || to === 'DONE' || !assignee) return false;
  return !assignee.active || !assignee.isProjectMember;
}
