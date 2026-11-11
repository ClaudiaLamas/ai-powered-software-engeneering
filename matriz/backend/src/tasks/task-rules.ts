import { ProblemException } from '../common/problem.js';
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

/** Campo do pedido onde vem o responsável: `assigneeIds` ao criar, `accountId` ao atribuir. */
export type AssigneeField = 'assigneeIds' | 'accountId';

/** `ASSIGNEE_NOT_MEMBER` (PN06): o responsável não é membro do projeto (ou não existe). */
export function assigneeNotMember(field: AssigneeField) {
  return ruleError(
    'ASSIGNEE_NOT_MEMBER',
    field,
    'O responsável tem de ser membro do projeto.',
  );
}

/** `ASSIGNEE_NOT_ACTIVE` (PN08, DE15): o responsável tem a conta pendente ou desativada. */
export function assigneeNotActive(field: AssigneeField) {
  return ruleError(
    'ASSIGNEE_NOT_ACTIVE',
    field,
    'O responsável tem de ter a conta ativa.',
  );
}

/** `409 ASSIGNEE_ALREADY_ASSIGNED` (DE16): a conta já é responsável pela tarefa. */
export function assigneeAlreadyAssigned() {
  return new ProblemException(
    409,
    'ASSIGNEE_ALREADY_ASSIGNED',
    'Conflito',
    'Esta pessoa já é responsável pela tarefa.',
  );
}

/** `404 ASSIGNEE_NOT_FOUND`: a conta indicada não é responsável pela tarefa. */
export function assigneeNotFound() {
  return new ProblemException(
    404,
    'ASSIGNEE_NOT_FOUND',
    'Não encontrado',
    'Esta pessoa não é responsável pela tarefa.',
  );
}

/** Um responsável visto pela regra de reabertura (PN07, PN08). */
export interface AssigneeStanding {
  accountId: string;
  /** A conta está ativa. */
  active: boolean;
  /** A conta é membro do projeto da tarefa. */
  isProjectMember: boolean;
}

/**
 * Reabrir (PN10, DE14, DE16): quando uma tarefa sai de `DONE`, saem dos
 * responsáveis as contas que já não são membros do projeto (PN07) ou estão
 * desativadas (PN08); os outros mantêm-se. Devolve os ids a tirar, pela ordem
 * em que vieram.
 */
export function assigneesRemovedOnStatusChange(
  from: TaskStatus,
  to: TaskStatus,
  assignees: readonly AssigneeStanding[],
): string[] {
  if (from !== 'DONE' || to === 'DONE') return [];
  return assignees
    .filter((a) => !a.active || !a.isProjectMember)
    .map((a) => a.accountId);
}
