import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../authorization/admin.guard.js';
import {
  type AuthenticatedAccount,
  CurrentAccount,
} from '../authorization/authenticated-account.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { IdParam } from '../common/id-param.js';
import { validationError } from '../common/problem.js';
import type { ProjectDto, ProjectSummaryDto } from './project.dto.js';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
} from './project.requests.js';
import { ProjectsService } from './projects.service.js';

/**
 * Operações de projetos (openapi.yaml, tag `projects`). Ordem das
 * verificações: `401` (guard global) → `403 NOT_ADMIN` (AdminGuard) →
 * `400 VALIDATION_ERROR` (ValidationPipe) → `404` → `403` → `409` → `400`
 * das regras (serviço). A conta vem sempre do token.
 */
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly authz: AuthorizationService,
  ) {}

  /** `GET /projects` — `listMyProjects` (FN05, US05). */
  @Get()
  async listMine(
    @CurrentAccount() account: AuthenticatedAccount,
  ): Promise<{ items: ProjectSummaryDto[] }> {
    return { items: await this.projects.listForAccount(account.id) };
  }

  /** `POST /projects` — `createProject` (FN03, US03): só o Administrador. */
  @Post()
  @UseGuards(AdminGuard)
  @HttpCode(201)
  async create(
    @CurrentAccount() account: AuthenticatedAccount,
    @Body() body: CreateProjectRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProjectDto> {
    const project = await this.projects.create(account.id, body);
    res.location(`/projects/${project.id}`);
    return project;
  }

  /** `GET /projects/{projectId}` — `getProject` (US09, US18): qualquer membro. */
  @Get(':projectId')
  async get(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('projectId') projectId: string,
  ): Promise<ProjectDto> {
    const access = await this.authz.requireMember(account.id, projectId);
    return this.projects.get(access);
  }

  /** `PATCH /projects/{projectId}` — `updateProject` (US10): só o Gestor, projeto ativo. */
  @Patch(':projectId')
  async update(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('projectId') projectId: string,
    @Body() body: UpdateProjectRequest,
  ): Promise<ProjectDto> {
    // `minProperties: 1` no contrato: é formato, por isso vem antes do 404.
    if (body.name === undefined && body.description === undefined) {
      throw validationError([
        { field: 'body', message: 'Indique pelo menos um campo a alterar.' },
      ]);
    }
    const access = await this.authz.requireMember(account.id, projectId);
    this.authz.requireManager(access);
    this.authz.requireWritable(access);
    return this.projects.update(access, body);
  }

  /** `POST /projects/{projectId}/archive` — `archiveProject` (US10): só o Gestor, projeto ativo. */
  @Post(':projectId/archive')
  @HttpCode(200)
  async archive(
    @CurrentAccount() account: AuthenticatedAccount,
    @IdParam('projectId') projectId: string,
  ): Promise<ProjectDto> {
    const access = await this.authz.requireMember(account.id, projectId);
    this.authz.requireManager(access);
    this.authz.requireWritable(access);
    return this.projects.archive(access);
  }
}
