import { Injectable } from '@nestjs/common';
import type {
  CommentAccess,
  TaskAccess,
} from '../authorization/authorization.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { writeInActiveProject } from './active-project-write.js';
import { normalizeCommentBody } from './comment-rules.js';
import { type CommentDto, commentSelect, toCommentDto } from './comment.dto.js';

/**
 * Comentários das tarefas (módulo `tasks`, architecture.md; US13, US19,
 * PN15, CL12): listar, criar, editar e apagar os próprios.
 *
 * As verificações de acesso (`404` → `403` → `409`) são feitas pelo
 * controlador com o AuthorizationService antes de chamar este serviço. O
 * autor vem sempre da conta do token e as datas do backend (`editedAt`) ou da
 * base de dados (`createdAt`), nunca do pedido.
 */

const taskNotFound = () =>
  new ProblemException(
    404,
    'TASK_NOT_FOUND',
    'Não encontrado',
    'A tarefa não existe.',
  );

const commentNotFound = () =>
  new ProblemException(
    404,
    'COMMENT_NOT_FOUND',
    'Não encontrado',
    'O comentário não existe.',
  );

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  /**
   * `listTaskComments` (US19): só depois de `requireTask`. Do mais antigo
   * para o mais recente, e pelo id em caso de empate (decisão interna,
   * 2026-11-11). Inclui os comentários de quem já saiu do projeto ou tem a
   * conta desativada (CL12).
   */
  async list(access: TaskAccess): Promise<{ items: CommentDto[] }> {
    const rows = await this.prisma.comment.findMany({
      where: { taskId: access.taskId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: commentSelect,
    });
    return { items: rows.map(toCommentDto) };
  }

  /** `createTaskComment` (US13): só depois de `requireTask` e `requireWritable`; qualquer membro. */
  async create(
    access: TaskAccess,
    authorId: string,
    body: string | undefined,
  ): Promise<CommentDto> {
    const text = normalizeCommentBody(body);
    const comment = await writeInActiveProject(
      this.prisma,
      this.authz,
      access,
      async (tx) => {
        // Bloqueia a tarefa contra uma eliminação ao mesmo tempo: sem linha,
        // foi eliminada depois das verificações do controlador.
        const [task] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM task WHERE id = ${access.taskId}::uuid FOR SHARE`;
        if (!task) throw taskNotFound();
        return tx.comment.create({
          data: { taskId: access.taskId, authorId, body: text },
          select: commentSelect,
        });
      },
    );
    return toCommentDto(comment);
  }

  /**
   * `updateComment` (US13, PN15): só depois de `requireComment`,
   * `requireCommentAuthor` e `requireWritable`. Muda o texto e preenche
   * `editedAt`; `createdAt` e o autor não mudam.
   */
  async update(
    access: CommentAccess,
    body: string | undefined,
  ): Promise<CommentDto> {
    const text = normalizeCommentBody(body);
    const comment = await writeInActiveProject(
      this.prisma,
      this.authz,
      access,
      async (tx) => {
        const { count } = await tx.comment.updateMany({
          where: { id: access.commentId },
          data: { body: text, editedAt: new Date() },
        });
        // Outro pedido apagou o comentário (ou a tarefa) entretanto.
        if (count === 0) throw commentNotFound();
        return tx.comment.findUniqueOrThrow({
          where: { id: access.commentId },
          select: commentSelect,
        });
      },
    );
    return toCommentDto(comment);
  }

  /**
   * `deleteComment` (US13, PN15): só depois de `requireComment`,
   * `requireCommentAuthor` e `requireWritable`. Eliminação definitiva
   * (database.md §6).
   */
  async remove(access: CommentAccess): Promise<void> {
    await writeInActiveProject(this.prisma, this.authz, access, async (tx) => {
      const { count } = await tx.comment.deleteMany({
        where: { id: access.commentId },
      });
      if (count === 0) throw commentNotFound();
    });
  }
}
