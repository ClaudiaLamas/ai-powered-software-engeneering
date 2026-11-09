/**
 * Rotas de exemplo, só para os testes de API: mostram como as operações de
 * projetos, tarefas e comentários (incrementos seguintes) vão usar o módulo
 * `authorization`. Não estão registadas na aplicação (AppModule).
 *
 * Padrão em cada operação:
 * 1. a conta vem sempre do token, com `@CurrentAccount()`; o corpo do pedido
 *    nunca traz `authorId`, `ownerId` ou `accountId` (o ValidationPipe recusa
 *    campos desconhecidos com `400`);
 * 2. os identificadores do caminho passam por `@IdParam()` (UUID, senão `400`);
 * 3. o controlador chama o AuthorizationService antes de fazer a operação:
 *    `require*` (`404`) → `requireManager` / `requireCommentAuthor` (`403`) →
 *    `requireWritable` (`409`).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString, MinLength } from 'class-validator';
import { AdminGuard } from '../src/authorization/admin.guard.js';
import {
  type AuthenticatedAccount,
  CurrentAccount,
} from '../src/authorization/authenticated-account.js';
import { AuthorizationService } from '../src/authorization/authorization.service.js';
import { IdParam } from '../src/common/id-param.js';

class CommentBody {
  @IsString()
  @MinLength(1)
  body!: string;
}

class StatusBody {
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  status!: string;
}

class ProjectBody {
  @IsString()
  description!: string;
}

@Controller('exemplo')
class AuthorizationExampleController {
  constructor(private readonly authz: AuthorizationService) {}

  /** Como `getProject`: qualquer membro. */
  @Get('projects/:projectId')
  async getProject(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('projectId') projectId: string,
  ) {
    return this.authz.requireMember(account.id, projectId);
  }

  /** Como `updateProject`: só o Gestor, projeto ativo. */
  @Patch('projects/:projectId')
  async updateProject(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('projectId') projectId: string,
    @Body() _body: ProjectBody,
  ) {
    const access = await this.authz.requireMember(account.id, projectId);
    this.authz.requireManager(access);
    this.authz.requireWritable(access);
    return access;
  }

  /** Como `changeTaskStatus`: qualquer membro, projeto ativo. */
  @Put('tasks/:taskId/status')
  async changeTaskStatus(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
    @Body() _body: StatusBody,
  ) {
    const access = await this.authz.requireTask(account.id, taskId);
    this.authz.requireWritable(access);
    return access;
  }

  /** Como `updateTask` (incluindo mudar o responsável): só o Gestor, projeto ativo. */
  @Patch('tasks/:taskId')
  async updateTask(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
  ) {
    const access = await this.authz.requireTask(account.id, taskId);
    this.authz.requireManager(access);
    this.authz.requireWritable(access);
    return access;
  }

  /** Como `createTaskComment`: o autor é a conta do token. */
  @Post('tasks/:taskId/comments')
  async createComment(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
    @Body() body: CommentBody,
  ) {
    const access = await this.authz.requireTask(account.id, taskId);
    this.authz.requireWritable(access);
    return { taskId: access.taskId, authorId: account.id, body: body.body };
  }

  /** Como `deleteComment`: só o autor, projeto ativo. */
  @Delete('comments/:commentId')
  @HttpCode(204)
  async deleteComment(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('commentId') commentId: string,
  ) {
    const comment = await this.authz.requireComment(account.id, commentId);
    this.authz.requireCommentAuthor(account.id, comment);
    this.authz.requireWritable(comment);
  }

  /** Como as operações só para o Administrador (por exemplo, `listAccounts`). */
  @Get('admin')
  @UseGuards(AdminGuard)
  admin() {
    return { ok: true };
  }
}

@Module({ controllers: [AuthorizationExampleController] })
export class AuthorizationExampleModule {}
