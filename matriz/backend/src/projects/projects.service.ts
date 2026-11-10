import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { ProjectAccess } from '../authorization/authorization.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProgressService } from '../progress/progress.service.js';
import {
  type ProjectDto,
  type ProjectSummaryDto,
  toProjectDto,
} from './project.dto.js';
import {
  managerDeactivated,
  managerRequired,
  normalizeDescription,
  normalizeName,
} from './project-rules.js';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from './project.requests.js';

/** Seleção do projeto com os membros: o Gestor primeiro, depois por nome. */
const projectWithMembers = {
  id: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  members: {
    select: {
      role: true,
      addedAt: true,
      account: { select: { id: true, name: true, status: true } },
    },
    orderBy: [{ role: 'asc' }, { account: { name: 'asc' } }],
  },
} satisfies Prisma.ProjectSelect;

/**
 * Módulo Projetos e membros (`projects`, architecture.md): criar, listar,
 * consultar, editar e arquivar projetos. Os projetos nunca são eliminados
 * (database.md §4): arquivar é a forma de os retirar de uso.
 *
 * As verificações de acesso (`404` → `403` → `409`) são feitas pelo
 * controlador com o AuthorizationService antes de chamar este serviço.
 */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationService,
  ) {}

  /**
   * `createProject` (US03, DE06): o projeto fica "Ativo", com o Gestor como
   * único membro, e o registo recebe `CREATE_PROJECT` e `ASSIGN_MANAGER`,
   * tudo na mesma transação.
   */
  async create(
    actorId: string,
    body: CreateProjectRequest,
  ): Promise<ProjectDto> {
    // 404 antes das regras (ordem das verificações do contrato).
    const manager = body.managerId
      ? await this.prisma.account.findUnique({
          where: { id: body.managerId },
          select: { id: true, status: true },
        })
      : null;
    if (body.managerId && !manager) {
      throw new ProblemException(
        404,
        'ACCOUNT_NOT_FOUND',
        'Não encontrado',
        'A conta não existe.',
      );
    }

    const name = normalizeName(body.name);
    const description = normalizeDescription(body.description);
    if (!manager) throw managerRequired();
    // Contas ativas e pendentes podem ser Gestor (DE15); desativadas não (PN08).
    if (manager.status === 'DEACTIVATED') throw managerDeactivated();

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name,
          description,
          members: { create: { accountId: manager.id, role: 'MANAGER' } },
        },
        select: projectWithMembers,
      });
      await this.audit.record(tx, [
        { actorId, action: 'CREATE_PROJECT', targetProjectId: created.id },
        {
          actorId,
          action: 'ASSIGN_MANAGER',
          targetProjectId: created.id,
          targetAccountId: manager.id,
        },
      ]);
      return created;
    });
    return toProjectDto(project, await this.progress.forProject(project.id));
  }

  /**
   * `listMyProjects` (FN05, US05): os projetos onde a conta é Gestor ou
   * Membro, incluindo os arquivados, ordenados por nome. A permissão de
   * Administrador não acrescenta projetos (PN02). Sem paginação (openapi.yaml).
   */
  async listForAccount(accountId: string): Promise<ProjectSummaryDto[]> {
    const memberships = await this.prisma.projectMember.findMany({
      where: { accountId },
      select: {
        role: true,
        project: { select: { id: true, name: true, status: true } },
      },
      orderBy: [{ project: { name: 'asc' } }, { project: { id: 'asc' } }],
    });
    const progress = await this.progress.forProjects(
      memberships.map((m) => m.project.id),
    );
    return memberships.map(({ role, project }) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      myRole: role,
      progress: progress.get(project.id)!,
    }));
  }

  /** `getProject` (US09, US18): só depois de `requireMember`. */
  async get(access: ProjectAccess): Promise<ProjectDto> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: access.projectId },
      select: projectWithMembers,
    });
    return toProjectDto(project, await this.progress.forProject(project.id));
  }

  /**
   * `updateProject` (US10, DE07): só depois de `requireMember`,
   * `requireManager` e `requireWritable`. Só muda os campos enviados.
   */
  async update(
    access: ProjectAccess,
    body: UpdateProjectRequest,
  ): Promise<ProjectDto> {
    const data: { name?: string; description?: string | null } = {};
    if (body.name !== undefined) data.name = normalizeName(body.name);
    if (body.description !== undefined) {
      data.description = normalizeDescription(body.description);
    }
    await this.writeIfActive(access, data);
    return this.get(access);
  }

  /**
   * `archiveProject` (US10, DE07): o projeto passa a "Arquivado" e fica só de
   * leitura (PN09). Arquivar um projeto já arquivado dá `409`.
   */
  async archive(access: ProjectAccess): Promise<ProjectDto> {
    await this.writeIfActive(access, { status: 'ARCHIVED' });
    return this.get(access);
  }

  /**
   * Escreve só se o projeto ainda estiver ativo no momento da escrita: se
   * outro pedido o arquivou depois de `requireWritable`, responde `409`.
   */
  private async writeIfActive(
    access: ProjectAccess,
    data: { name?: string; description?: string | null; status?: 'ARCHIVED' },
  ): Promise<void> {
    const { count } = await this.prisma.project.updateMany({
      where: { id: access.projectId, status: 'ACTIVE' },
      data,
    });
    if (count === 0) {
      this.authz.requireWritable({ ...access, projectStatus: 'ARCHIVED' });
    }
  }
}
