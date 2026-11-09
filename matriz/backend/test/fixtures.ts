import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import type { AccountStatus } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Palavra-passe fictícia das contas de teste, gerada em cada execução. */
export const TEST_PASSWORD = `pw-${randomUUID()}`;
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

/** Arranca a aplicação como em main.ts, contra a base de dados de testes. */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
