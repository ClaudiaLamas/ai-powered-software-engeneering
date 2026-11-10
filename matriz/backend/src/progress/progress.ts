import type { TaskStatus } from '../generated/prisma/client.js';

/** Indicador de progresso, como em `Progress` (openapi.yaml; FN09, PN13). */
export interface ProgressDto {
  todo: number;
  inProgress: number;
  done: number;
  total: number;
  percentDone: number | null;
}

/**
 * Percentagem de conclusão (PN13): concluídas ÷ total × 100, arredondada à
 * unidade; `null` sem tarefas ("Sem tarefas").
 */
export function percentDone(done: number, total: number): number | null {
  return total === 0 ? null : Math.round((done / total) * 100);
}

/** Progresso a partir do número de tarefas em cada estado. */
export function progressFrom(
  counts: Partial<Record<TaskStatus, number>>,
): ProgressDto {
  const todo = counts.TODO ?? 0;
  const inProgress = counts.IN_PROGRESS ?? 0;
  const done = counts.DONE ?? 0;
  const total = todo + inProgress + done;
  return {
    todo,
    inProgress,
    done,
    total,
    percentDone: percentDone(done, total),
  };
}
