import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
} from '@nestjs/common';
import {
  type AuthenticatedAccount,
  CurrentAccount,
} from '../authorization/authenticated-account.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { IdParam } from '../common/id-param.js';
import type { CommentDto } from './comment.dto.js';
import { CommentBodyRequest } from './comment.requests.js';
import { CommentsService } from './comments.service.js';

/**
 * Operações de comentários (openapi.yaml, tag `comments`). A coleção está
 * aninhada na tarefa (`/tasks/{taskId}/comments`, acesso pelo projeto da
 * tarefa com `requireTask`); cada comentário tem a sua rota direta
 * (`/comments/{commentId}`, acesso pelo projeto da tarefa do comentário com
 * `requireComment`).
 *
 * Ordem das verificações: `401` (guard global) → `400 VALIDATION_ERROR`
 * (ValidationPipe: tipo do texto e campos desconhecidos, como `authorId`) →
 * `404` → `403 NOT_COMMENT_AUTHOR` → `409 PROJECT_ARCHIVED` →
 * `400 BODY_INVALID` (serviço). A conta vem sempre do token.
 */
@Controller()
export class CommentsController {
  constructor(
    private readonly comments: CommentsService,
    private readonly authz: AuthorizationService,
  ) {}

  /** `GET /tasks/{taskId}/comments` — `listTaskComments` (US19): qualquer membro. */
  @Get('tasks/:taskId/comments')
  async list(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
  ): Promise<{ items: CommentDto[] }> {
    const access = await this.authz.requireTask(account.id, taskId);
    return this.comments.list(access);
  }

  /** `POST /tasks/{taskId}/comments` — `createTaskComment` (US13): qualquer membro, projeto ativo. */
  @Post('tasks/:taskId/comments')
  @HttpCode(201)
  async create(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
    @Body() request: CommentBodyRequest,
  ): Promise<CommentDto> {
    const access = await this.authz.requireTask(account.id, taskId);
    this.authz.requireWritable(access);
    return this.comments.create(access, account.id, request.body);
  }

  /** `PATCH /comments/{commentId}` — `updateComment` (US13, PN15): só o autor, projeto ativo. */
  @Patch('comments/:commentId')
  async update(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('commentId') commentId: string,
    @Body() request: CommentBodyRequest,
  ): Promise<CommentDto> {
    const access = await this.authz.requireComment(account.id, commentId);
    this.authz.requireCommentAuthor(account.id, access);
    this.authz.requireWritable(access);
    return this.comments.update(access, request.body);
  }

  /** `DELETE /comments/{commentId}` — `deleteComment` (US13, PN15): só o autor, projeto ativo. */
  @Delete('comments/:commentId')
  @HttpCode(204)
  async remove(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('commentId') commentId: string,
  ): Promise<void> {
    const access = await this.authz.requireComment(account.id, commentId);
    this.authz.requireCommentAuthor(account.id, access);
    this.authz.requireWritable(access);
    await this.comments.remove(access);
  }
}
