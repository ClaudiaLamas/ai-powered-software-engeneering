import type {
  AccountStatus,
  ProjectRole,
  ProjectStatus,
} from '../generated/prisma/client.js';
import type { ProgressDto } from '../progress/progress.js';

/** `AccountSummary` (openapi.yaml). */
export interface AccountSummaryDto {
  id: string;
  name: string;
  status: AccountStatus;
}

/** `ProjectMember` (openapi.yaml). */
export interface ProjectMemberDto {
  account: AccountSummaryDto;
  role: ProjectRole;
  addedAt: string;
}

/** `Project` (openapi.yaml): o projeto visto por um membro (US09, US18). */
export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  manager: AccountSummaryDto;
  members: ProjectMemberDto[];
  progress: ProgressDto;
  createdAt: string;
}

/** `ProjectSummary` (openapi.yaml): o projeto no painel inicial (FN05). */
export interface ProjectSummaryDto {
  id: string;
  name: string;
  status: ProjectStatus;
  myRole: ProjectRole;
  progress: ProgressDto;
}

/** Projeto lido com os membros e as contas, como o serviço o carrega. */
export interface ProjectWithMembers {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: Date;
  members: {
    role: ProjectRole;
    addedAt: Date;
    account: AccountSummaryDto;
  }[];
}

export function toProjectDto(
  project: ProjectWithMembers,
  progress: ProgressDto,
): ProjectDto {
  const manager = project.members.find((m) => m.role === 'MANAGER');
  if (!manager) {
    // Cada projeto tem exatamente um Gestor (DE06); sem ele os dados estão inconsistentes.
    throw new Error(`O projeto ${project.id} não tem Gestor.`);
  }
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    manager: manager.account,
    members: project.members.map((m) => ({
      account: m.account,
      role: m.role,
      addedAt: m.addedAt.toISOString(),
    })),
    progress,
    createdAt: project.createdAt.toISOString(),
  };
}
