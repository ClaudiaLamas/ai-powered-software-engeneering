import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  TEST_PASSWORD,
  createAccount,
  createProject,
  createTask,
  createTestApp,
} from './fixtures.js';

/**
 * Projetos: criar (US03), listar (US05), consultar (US18), editar e arquivar
 * (US10). Não há eliminação de projetos (openapi.yaml, database.md §4).
 */
describe('Projetos (API)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.body.accessToken as string;
  }

  async function accountWithToken(
    overrides: Parameters<typeof createAccount>[1] = {},
  ) {
    const account = await createAccount(app, overrides);
    return { account, token: await login(account.email) };
  }

  function api(token: string) {
    const server = app.getHttpServer();
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
    return {
      list: () => auth(request(server).get('/projects')),
      create: (body: object) =>
        auth(request(server).post('/projects')).send(body),
      get: (id: string) => auth(request(server).get(`/projects/${id}`)),
      update: (id: string, body: object) =>
        auth(request(server).patch(`/projects/${id}`)).send(body),
      archive: (id: string) =>
        auth(request(server).post(`/projects/${id}/archive`)),
    };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects (createProject, US03)', () => {
    let admin: { account: { id: string }; token: string };
    let manager: { id: string; name: string };

    beforeAll(async () => {
      admin = await accountWithToken({ isAdmin: true, name: 'Administrador' });
      manager = await createAccount(app, { name: 'Ana Gestora' });
    });

    it('cria o projeto "Ativo", com o Gestor como único membro, e regista as duas ações', async () => {
      const res = await api(admin.token)
        .create({
          name: '  Site  ',
          description: 'Novo site',
          managerId: manager.id,
        })
        .expect(201);

      expect(res.headers.location).toBe(`/projects/${res.body.id}`);
      expect(res.body).toMatchObject({
        name: 'Site',
        description: 'Novo site',
        status: 'ACTIVE',
        manager: { id: manager.id, name: 'Ana Gestora', status: 'ACTIVE' },
        members: [
          {
            account: { id: manager.id },
            role: 'MANAGER',
            addedAt: expect.any(String),
          },
        ],
        progress: {
          todo: 0,
          inProgress: 0,
          done: 0,
          total: 0,
          percentDone: null,
        },
        createdAt: expect.any(String),
      });
      expect(res.body.members).toHaveLength(1);

      const log = await prisma.adminAuditLog.findMany({
        where: { targetProjectId: res.body.id },
        orderBy: { action: 'asc' },
      });
      expect(log).toEqual([
        expect.objectContaining({
          action: 'CREATE_PROJECT',
          actorId: admin.account.id,
          targetAccountId: null,
        }),
        expect.objectContaining({
          action: 'ASSIGN_MANAGER',
          actorId: admin.account.id,
          targetAccountId: manager.id,
        }),
      ]);
    });

    it('aceita um Gestor com conta pendente (DE15) e guarda a descrição vazia como null', async () => {
      const pending = await createAccount(app, { status: 'PENDING' });
      const res = await api(admin.token)
        .create({ name: 'Campanha', description: '   ', managerId: pending.id })
        .expect(201);
      expect(res.body.description).toBeNull();
      expect(res.body.manager).toMatchObject({
        id: pending.id,
        status: 'PENDING',
      });
    });

    it('o Administrador que cria o projeto não fica membro nem o vê na sua lista (PN02)', async () => {
      const res = await api(admin.token)
        .create({ name: 'Só do Gestor', managerId: manager.id })
        .expect(201);
      await api(admin.token).get(res.body.id).expect(404);
      const list = await api(admin.token).list().expect(200);
      expect(list.body.items.map((p: { id: string }) => p.id)).not.toContain(
        res.body.id,
      );
    });

    it.each([
      ['em falta', {}],
      ['vazio', { name: '' }],
      ['só com espaços', { name: '     ' }],
      ['com 2 caracteres', { name: 'ab' }],
      ['com 101 caracteres', { name: 'a'.repeat(101) }],
    ])('recusa um nome %s com 400 NAME_INVALID', async (_, nameField) => {
      const before = await prisma.project.count();
      const res = await api(admin.token)
        .create({ ...nameField, managerId: manager.id })
        .expect(400);
      expect(res.body.code).toBe('NAME_INVALID');
      expect(await prisma.project.count()).toBe(before);
    });

    it('aceita nomes com 3 e 100 caracteres', async () => {
      await api(admin.token)
        .create({ name: 'abc', managerId: manager.id })
        .expect(201);
      await api(admin.token)
        .create({ name: 'a'.repeat(100), managerId: manager.id })
        .expect(201);
    });

    it('recusa uma descrição com mais de 1000 caracteres com 400 DESCRIPTION_TOO_LONG', async () => {
      const res = await api(admin.token)
        .create({
          name: 'Site',
          description: 'a'.repeat(1001),
          managerId: manager.id,
        })
        .expect(400);
      expect(res.body.code).toBe('DESCRIPTION_TOO_LONG');
    });

    it('recusa a falta de Gestor com 400 MANAGER_REQUIRED', async () => {
      const res = await api(admin.token).create({ name: 'Site' }).expect(400);
      expect(res.body.code).toBe('MANAGER_REQUIRED');
    });

    it('recusa um Gestor com conta desativada com 400 MANAGER_DEACTIVATED', async () => {
      const rui = await createAccount(app, { status: 'DEACTIVATED' });
      const res = await api(admin.token)
        .create({ name: 'Site', managerId: rui.id })
        .expect(400);
      expect(res.body.code).toBe('MANAGER_DEACTIVATED');
    });

    it('responde 404 ACCOUNT_NOT_FOUND a um Gestor que não existe, antes das regras', async () => {
      const res = await api(admin.token)
        .create({ name: 'ab', managerId: randomUUID() })
        .expect(404);
      expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it.each([
      ['managerId que não é UUID', { name: 'Site', managerId: 'abc' }],
      ['nome que não é texto', { name: 42, managerId: randomUUID() }],
      ['nome null', { name: null, managerId: randomUUID() }],
      [
        'campo desconhecido',
        { name: 'Site', managerId: randomUUID(), ownerId: randomUUID() },
      ],
    ])('recusa %s com 400 VALIDATION_ERROR', async (_, body) => {
      const res = await api(admin.token).create(body).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('recusa uma conta sem permissão de Administrador com 403 NOT_ADMIN, antes da validação', async () => {
      const { token } = await accountWithToken();
      const before = await prisma.project.count();
      const res = await api(token).create({ name: 42 }).expect(403);
      expect(res.body.code).toBe('NOT_ADMIN');
      expect(await prisma.project.count()).toBe(before);
    });

    it('recusa um pedido sem sessão com 401', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'Site', managerId: manager.id })
        .expect(401);
    });
  });

  describe('GET /projects (listMyProjects, US05)', () => {
    it('lista só os projetos onde a conta participa, por nome, com a função e o progresso', async () => {
      const { account, token } = await accountWithToken();
      const other = await createAccount(app);
      const site = await createProject(app, [
        { accountId: account.id, role: 'MANAGER' },
      ]);
      const campanha = await createProject(app, [
        { accountId: other.id, role: 'MANAGER' },
        { accountId: account.id, role: 'MEMBER' },
      ]);
      const intranet = await createProject(
        app,
        [
          { accountId: account.id, role: 'MEMBER' },
          { accountId: other.id, role: 'MANAGER' },
        ],
        'ARCHIVED',
      );
      await createProject(app, [{ accountId: other.id, role: 'MANAGER' }]);
      await prisma.project.update({
        where: { id: site.id },
        data: { name: 'Site' },
      });
      await prisma.project.update({
        where: { id: campanha.id },
        data: { name: 'Campanha' },
      });
      await prisma.project.update({
        where: { id: intranet.id },
        data: { name: 'Intranet' },
      });
      for (const status of ['TODO', 'DONE', 'DONE', 'DONE'] as const) {
        const task = await createTask(app, site.id);
        await prisma.task.update({ where: { id: task.id }, data: { status } });
      }

      const res = await api(token).list().expect(200);

      expect(res.body.items).toEqual([
        {
          id: campanha.id,
          name: 'Campanha',
          status: 'ACTIVE',
          myRole: 'MEMBER',
          progress: {
            todo: 0,
            inProgress: 0,
            done: 0,
            total: 0,
            percentDone: null,
          },
        },
        {
          id: intranet.id,
          name: 'Intranet',
          status: 'ARCHIVED',
          myRole: 'MEMBER',
          progress: {
            todo: 0,
            inProgress: 0,
            done: 0,
            total: 0,
            percentDone: null,
          },
        },
        {
          id: site.id,
          name: 'Site',
          status: 'ACTIVE',
          myRole: 'MANAGER',
          progress: {
            todo: 1,
            inProgress: 0,
            done: 3,
            total: 4,
            percentDone: 75,
          },
        },
      ]);
    });

    it('a permissão de Administrador não acrescenta projetos (PN02)', async () => {
      const { token } = await accountWithToken({ isAdmin: true });
      const other = await createAccount(app);
      await createProject(app, [{ accountId: other.id, role: 'MANAGER' }]);
      const res = await api(token).list().expect(200);
      expect(res.body).toEqual({ items: [] });
    });

    it('recusa um pedido sem sessão com 401', async () => {
      await request(app.getHttpServer()).get('/projects').expect(401);
    });
  });

  describe('GET /projects/{projectId} (getProject, US18)', () => {
    it('mostra a um Membro o projeto, o Gestor e os membros com a função', async () => {
      const ana = await createAccount(app, { name: 'Ana' });
      const { account: bruno, token } = await accountWithToken({
        name: 'Bruno',
      });
      const rui = await createAccount(app, {
        name: 'Rui',
        status: 'DEACTIVATED',
      });
      const project = await createProject(app, [
        { accountId: rui.id, role: 'MEMBER' },
        { accountId: bruno.id, role: 'MEMBER' },
        { accountId: ana.id, role: 'MANAGER' },
      ]);

      const res = await api(token).get(project.id).expect(200);

      expect(res.body).toMatchObject({
        id: project.id,
        name: project.name,
        description: null,
        status: 'ACTIVE',
        manager: { id: ana.id, name: 'Ana', status: 'ACTIVE' },
      });
      expect(
        res.body.members.map(
          (m: { account: { name: string; status: string }; role: string }) => [
            m.account.name,
            m.role,
            m.account.status,
          ],
        ),
      ).toEqual([
        ['Ana', 'MANAGER', 'ACTIVE'],
        ['Bruno', 'MEMBER', 'ACTIVE'],
        ['Rui', 'MEMBER', 'DEACTIVATED'],
      ]);
    });

    it('responde 404 PROJECT_NOT_FOUND a quem não é membro, mesmo Administrador, como a um projeto que não existe', async () => {
      const manager = await createAccount(app);
      const project = await createProject(app, [
        { accountId: manager.id, role: 'MANAGER' },
      ]);
      const { token: outsider } = await accountWithToken();
      const { token: admin } = await accountWithToken({ isAdmin: true });

      const responses = [
        await api(outsider).get(project.id).expect(404),
        await api(admin).get(project.id).expect(404),
        await api(outsider).get(randomUUID()).expect(404),
      ];
      for (const res of responses) {
        expect(res.body).toEqual(responses[2].body);
        expect(res.body.code).toBe('PROJECT_NOT_FOUND');
      }
    });

    it('recusa um identificador que não é UUID com 400 VALIDATION_ERROR', async () => {
      const { token } = await accountWithToken();
      const res = await api(token).get('abc').expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /projects/{projectId} e POST /projects/{projectId}/archive (US10)', () => {
    let managerToken: string;
    let memberToken: string;
    let memberAdminToken: string;
    let outsiderAdminToken: string;
    let managerId: string;
    let memberId: string;
    let memberAdminId: string;

    async function newProject(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
      const project = await createProject(
        app,
        [
          { accountId: managerId, role: 'MANAGER' },
          { accountId: memberId, role: 'MEMBER' },
          { accountId: memberAdminId, role: 'MEMBER' },
        ],
        status,
      );
      return prisma.project.update({
        where: { id: project.id },
        data: { name: 'Site', description: 'Antiga' },
      });
    }

    beforeAll(async () => {
      const manager = await accountWithToken();
      const member = await accountWithToken();
      const memberAdmin = await accountWithToken({ isAdmin: true });
      const outsiderAdmin = await accountWithToken({ isAdmin: true });
      managerToken = manager.token;
      memberToken = member.token;
      memberAdminToken = memberAdmin.token;
      outsiderAdminToken = outsiderAdmin.token;
      managerId = manager.account.id;
      memberId = member.account.id;
      memberAdminId = memberAdmin.account.id;
    });

    it('o Gestor altera a descrição e o projeto mostra a nova descrição', async () => {
      const project = await newProject();
      const res = await api(managerToken)
        .update(project.id, { description: 'Nova descrição' })
        .expect(200);
      expect(res.body).toMatchObject({
        id: project.id,
        name: 'Site',
        description: 'Nova descrição',
        status: 'ACTIVE',
      });
      await api(memberToken)
        .get(project.id)
        .expect(200)
        .expect((r) => expect(r.body.description).toBe('Nova descrição'));
    });

    it('o Gestor altera o nome (aparado) e apaga a descrição com null ou texto vazio', async () => {
      const project = await newProject();
      await api(managerToken)
        .update(project.id, { name: '  Site novo ', description: null })
        .expect(200)
        .expect((r) =>
          expect(r.body).toMatchObject({
            name: 'Site novo',
            description: null,
          }),
        );
      await api(managerToken)
        .update(project.id, { description: 'x' })
        .expect(200);
      await api(managerToken)
        .update(project.id, { description: '' })
        .expect(200)
        .expect((r) => expect(r.body.description).toBeNull());
    });

    it('recusa regras inválidas com NAME_INVALID e DESCRIPTION_TOO_LONG, sem alterar o projeto', async () => {
      const project = await newProject();
      const name = await api(managerToken)
        .update(project.id, { name: ' a ' })
        .expect(400);
      expect(name.body.code).toBe('NAME_INVALID');
      const description = await api(managerToken)
        .update(project.id, { description: 'a'.repeat(1001) })
        .expect(400);
      expect(description.body.code).toBe('DESCRIPTION_TOO_LONG');
      expect(
        await prisma.project.findUnique({ where: { id: project.id } }),
      ).toMatchObject({
        name: 'Site',
        description: 'Antiga',
      });
    });

    it.each([
      ['corpo vazio', {}],
      ['nome null', { name: null }],
      ['campo desconhecido', { status: 'ARCHIVED' }],
    ])('recusa %s com 400 VALIDATION_ERROR, antes do 404', async (_, body) => {
      const res = await api(outsiderAdminToken)
        .update(randomUUID(), body)
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('recusa um Membro, com ou sem permissão de Administrador, com 403 NOT_PROJECT_MANAGER', async () => {
      const project = await newProject();
      for (const token of [memberToken, memberAdminToken]) {
        const edit = await api(token)
          .update(project.id, { description: 'x' })
          .expect(403);
        expect(edit.body.code).toBe('NOT_PROJECT_MANAGER');
        const archive = await api(token).archive(project.id).expect(403);
        expect(archive.body.code).toBe('NOT_PROJECT_MANAGER');
      }
      expect(
        await prisma.project.findUnique({ where: { id: project.id } }),
      ).toMatchObject({
        description: 'Antiga',
        status: 'ACTIVE',
      });
    });

    it('responde 404 a um Administrador que não é membro', async () => {
      const project = await newProject();
      const edit = await api(outsiderAdminToken)
        .update(project.id, { description: 'x' })
        .expect(404);
      expect(edit.body.code).toBe('PROJECT_NOT_FOUND');
      await api(outsiderAdminToken).archive(project.id).expect(404);
    });

    it('o Gestor arquiva o projeto, que continua visível para os membros', async () => {
      const project = await newProject();
      const res = await api(managerToken).archive(project.id).expect(200);
      expect(res.body).toMatchObject({ id: project.id, status: 'ARCHIVED' });
      await api(memberToken)
        .get(project.id)
        .expect(200)
        .expect((r) => expect(r.body.status).toBe('ARCHIVED'));
      const list = await api(memberToken).list().expect(200);
      expect(list.body.items).toContainEqual(
        expect.objectContaining({ id: project.id, status: 'ARCHIVED' }),
      );
    });

    it('num projeto arquivado, editar e arquivar respondem 409 PROJECT_ARCHIVED (PN09)', async () => {
      const project = await newProject('ARCHIVED');
      const edit = await api(managerToken)
        .update(project.id, { description: 'x' })
        .expect(409);
      expect(edit.body.code).toBe('PROJECT_ARCHIVED');
      const archive = await api(managerToken).archive(project.id).expect(409);
      expect(archive.body.code).toBe('PROJECT_ARCHIVED');
      // 409 antes das regras: um nome inválido também dá 409.
      await api(managerToken).update(project.id, { name: 'a' }).expect(409);
    });

    it('num projeto arquivado, um Membro recebe 403 (função antes de 409)', async () => {
      const project = await newProject('ARCHIVED');
      await api(memberToken)
        .update(project.id, { description: 'x' })
        .expect(403);
    });

    it('não há operação para eliminar um projeto', async () => {
      const project = await newProject();
      await request(app.getHttpServer())
        .delete(`/projects/${project.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);
      expect(
        await prisma.project.findUnique({ where: { id: project.id } }),
      ).not.toBeNull();
    });
  });
});
