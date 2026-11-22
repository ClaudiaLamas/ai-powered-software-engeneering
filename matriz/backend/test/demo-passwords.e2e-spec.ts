import { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  listDemoAccounts,
  resetDemoPasswords,
} from '../prisma/demo-passwords.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TEST_PASSWORD, createTestApp } from './fixtures.js';

// Troca da palavra-passe das contas de demonstração (prisma/reset-demo-passwords.ts),
// contra a base de dados de testes. Dados fictícios.

describe('resetDemoPasswords (contas de demonstração do seed)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const newPassword = `nova-${randomUUID()}`;
  const oldHash = bcrypt.hashSync(TEST_PASSWORD, 4);
  const suffix = randomUUID().slice(0, 8);

  const demo = `ana-${suffix}@matriz.test`;
  const demoDeactivated = `duarte-${suffix}@matriz.test`;
  const demoPending = `pendente-${suffix}@matriz.test`;
  const other = `outra-${suffix}@exemplo.test`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await prisma.account.createMany({
      data: [
        { name: 'Ana Demo', email: demo, status: 'ACTIVE', passwordHash: oldHash },
        { name: 'Duarte Demo', email: demoDeactivated, status: 'DEACTIVATED', passwordHash: oldHash },
        { name: 'Pendente Demo', email: demoPending, status: 'PENDING', passwordHash: null },
        { name: 'Outra Conta', email: other, status: 'ACTIVE', passwordHash: oldHash },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function account(email: string) {
    return prisma.account.findUniqueOrThrow({ where: { email } });
  }

  it('lista só as contas @matriz.test com palavra-passe, por ordem do email', async () => {
    const emails = await listDemoAccounts(prisma);
    expect(emails).toContain(demo);
    expect(emails).toContain(demoDeactivated);
    expect(emails).not.toContain(demoPending);
    expect(emails).not.toContain(other);
    expect(emails).toEqual([...emails].sort());
  });

  it('recusa uma palavra-passe com menos de 12 caracteres e não muda nada', async () => {
    await expect(resetDemoPasswords(prisma, 'curta', 4)).rejects.toThrow('12 caracteres');
    expect((await account(demo)).passwordHash).toBe(oldHash);
  });

  it('muda o hash só das contas de demonstração com palavra-passe', async () => {
    const before = await account(demo);
    const count = await resetDemoPasswords(prisma, newPassword, 4);

    expect(count).toBeGreaterThanOrEqual(2);
    const after = await account(demo);
    expect(await bcrypt.compare(newPassword, after.passwordHash!)).toBe(true);
    expect(await bcrypt.compare(TEST_PASSWORD, after.passwordHash!)).toBe(false);
    // O resto da conta fica igual.
    expect({ ...after, passwordHash: null }).toEqual({ ...before, passwordHash: null });

    const deactivated = await account(demoDeactivated);
    expect(deactivated.status).toBe('DEACTIVATED');
    expect(await bcrypt.compare(newPassword, deactivated.passwordHash!)).toBe(true);

    expect((await account(demoPending)).passwordHash).toBeNull();
    expect((await account(other)).passwordHash).toBe(oldHash);
  });

  it('depois da troca, a conta entra com a palavra-passe nova (POST /auth/login)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: demo, password: newPassword })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: demo, password: TEST_PASSWORD })
      .expect(401);
  });
});
