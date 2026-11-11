import type { Prisma } from '../generated/prisma/client.js';
import type { AccountSummaryDto } from './task.dto.js';

/** `Comment` (openapi.yaml). */
export interface CommentDto {
  id: string;
  taskId: string;
  /** Com o estado da conta, para a indicação "conta desativada" (CL12). */
  author: AccountSummaryDto;
  body: string;
  createdAt: string;
  /** Preenchido quando o autor edita; `null` se nunca foi editado. */
  editedAt: string | null;
}

/** Seleção do comentário com o resumo do autor. */
export const commentSelect = {
  id: true,
  taskId: true,
  body: true,
  createdAt: true,
  editedAt: true,
  author: { select: { id: true, name: true, status: true } },
} satisfies Prisma.CommentSelect;

export type CommentRow = Prisma.CommentGetPayload<{
  select: typeof commentSelect;
}>;

export function toCommentDto(comment: CommentRow): CommentDto {
  return {
    id: comment.id,
    taskId: comment.taskId,
    author: comment.author,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
  };
}
