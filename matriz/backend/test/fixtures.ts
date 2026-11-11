import { INestApplication, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import type {
  AccountStatus,
  ProjectRole,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Palavra-passe fictícia das contas de teste, gerada em cada execução. */
export const TEST_PASSWORD = `pw-${randomUUID()}`;
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

/**
 * Arranca a aplicação como em main.ts, contra a base de dados de testes.
 * `extraModules` acrescenta módulos só para os testes (por exemplo, rotas de exemplo).
 */
export async function createTestApp(
  extraModules: Type[] = [],
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...extraModules],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

/** Cria uma conta de teste com dados fictícios e um email único. */
export async function createAccount(
  app: INestApplication,
  overrides: { status?: AccountStatus; isAdmin?: boolean; name?: string } = {},
) {
  const status = overrides.status ?? 'ACTIVE';
  return app.get(PrismaService).account.create({
    data: {
      name: overrides.name ?? 'Conta Teste',
      email: `teste-${randomUUID()}@exemplo.test`,
      status,
      isAdmin: overrides.isAdmin ?? false,
      passwordHash: status === 'PENDING' ? null : TEST_HASH,
    },
  });
}

/** Cria um projeto de teste com os membros indicados (dados fictícios). */
export async function createProject(
  app: INestApplication,
  members: { accountId: string; role: ProjectRole }[],
  status: ProjectStatus = 'ACTIVE',
) {
  return app.get(PrismaService).project.create({
    data: {
      name: `Projeto ${randomUUID().slice(0, 8)}`,
      status,
      members: { create: members },
    },
  });
}

/** Cria uma tarefa de teste num projeto (dados fictícios). */
export async function createTask(
  app: INestApplication,
  projectId: string,
  overrides: {
    title?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    /** Responsáveis (DE16); a fixture não verifica se são membros. */
    assigneeIds?: string[];
    createdAt?: Date;
  } = {},
) {
  const { assigneeIds = [], ...fields } = overrides;
  return app.get(PrismaService).task.create({
    data: {
      projectId,
      title: 'Tarefa de teste',
      ...fields,
      assignees: { create: assigneeIds.map((accountId) => ({ accountId })) },
    },
  });
}

/** Cria um comentário de teste numa tarefa. */
export async function createComment(
  app: INestApplication,
  taskId: string,
  authorId: string,
) {
  return app.get(PrismaService).comment.create({
    data: { taskId, authorId, body: 'Comentário de teste' },
  });
}
