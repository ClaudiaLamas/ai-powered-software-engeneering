import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  type AuthenticatedAccount,
  CurrentAccount,
} from '../authorization/authenticated-account.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { IdParam } from '../common/id-param.js';
import { validationError } from '../common/problem.js';
import type { TaskDto, TaskPageDto } from './task.dto.js';
import {
  ChangeTaskStatusRequest,
  CreateTaskRequest,
  ListTasksQuery,
  UpdateTaskRequest,
} from './task.requests.js';
import { TasksService } from './tasks.service.js';

/**
 * Operações de tarefas (openapi.yaml, tag `tasks`). A coleção está aninhada no
 * projeto (`/projects/{projectId}/tasks`, acesso pelo projeto com
 * `requireMember`); cada tarefa tem a sua rota direta (`/tasks/{taskId}`,
 * acesso pelo projeto da tarefa com `requireTask`).
 *
 * Ordem das verificações: `401` (guard global) → `400 VALIDATION_ERROR`
 * (ValidationPipe e `minProperties`) → `404` → `403 NOT_PROJECT_MANAGER` →
 * `409 PROJECT_ARCHIVED` → `400` das regras (serviço). A conta vem sempre do
 * token.
 */
@Controller()
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly authz: AuthorizationService,
  ) {}

  /** `GET /projects/{projectId}/tasks` — `listProjectTasks` (US08, US23): qualquer membro. */
  @Get('projects/:projectId/tasks')
  async list(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('projectId') projectId: string,
    @Query() query: ListTasksQuery,
  ): Promise<TaskPageDto> {
    const access = await this.authz.requireMember(account.id, projectId);
    return this.tasks.list(access, query);
  }

  /** `POST /projects/{projectId}/tasks` — `createProjectTask` (US06, US22): só o Gestor, projeto ativo. */
  @Post('projects/:projectId/tasks')
  @HttpCode(201)
  async create(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('projectId') projectId: string,
    @Body() body: CreateTaskRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TaskDto> {
    const access = await this.authz.requireMember(account.id, projectId);
    this.authz.requireManager(access);
    this.authz.requireWritable(access);
    const task = await this.tasks.create(access, body);
    res.location(`/tasks/${task.id}`);
    return task;
  }

  /** `GET /tasks/{taskId}` — `getTask` (US19): qualquer membro do projeto da tarefa. */
  @Get('tasks/:taskId')
  async get(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
  ): Promise<TaskDto> {
    const access = await this.authz.requireTask(account.id, taskId);
    return this.tasks.get(access);
  }

  /** `PATCH /tasks/{taskId}` — `updateTask` (US06, US22): só o Gestor, projeto ativo. */
  @Patch('tasks/:taskId')
  async update(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
    @Body() body: UpdateTaskRequest,
  ): Promise<TaskDto> {
    // `minProperties: 1` no contrato: é formato, por isso vem antes do 404.
    if (
      body.title === undefined &&
      body.description === undefined &&
      body.priority === undefined &&
      body.assigneeId === undefined
    ) {
      throw validationError([
        { field: 'body', message: 'Indique pelo menos um campo a alterar.' },
      ]);
    }
    const access = await this.authz.requireTask(account.id, taskId);
    this.authz.requireManager(access);
    this.authz.requireWritable(access);
    return this.tasks.update(access, body);
  }

  /** `PUT /tasks/{taskId}/status` — `changeTaskStatus` (US07): qualquer membro, projeto ativo. */
  @Put('tasks/:taskId/status')
  async changeStatus(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
    @Body() body: ChangeTaskStatusRequest,
  ): Promise<TaskDto> {
    const access = await this.authz.requireTask(account.id, taskId);
    this.authz.requireWritable(access);
    return this.tasks.changeStatus(access, body);
  }

  /** `DELETE /tasks/{taskId}` — `deleteTask` (US06, CL2): só o Gestor, projeto ativo. */
  @Delete('tasks/:taskId')
  @HttpCode(204)
  async remove(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('taskId') taskId: string,
  ): Promise<void> {
    const access = await this.authz.requireTask(account.id, taskId);
    this.authz.requireManager(access);
    this.authz.requireWritable(access);
    await this.tasks.remove(access);
  }
}
