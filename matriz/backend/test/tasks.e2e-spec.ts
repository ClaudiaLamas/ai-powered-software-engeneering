import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { ProjectAccess } from '../src/authorization/authorization.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TasksService } from '../src/tasks/tasks.service.js';
import {
  TEST_PASSWORD,
  createAccount,
  createComment,
  createProject,
  createTask,
  createTestApp,
} from './fixtures.js';

/**
 * Tarefas: criar, listar (com filtros e paginação), consultar, editar e
 * eliminar e mudar o estado (US06, US07, US08, US19, US22, US23; openapi.yaml
 * 0.4.0). A lista de responsáveis possíveis fica para outro passo.
 */
describe('Tarefas (API)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  type Actor = { account: { id: string; name: string }; token: string };

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.body.accessToken as string;
  }

  async function accountWithToken(
    overrides: Parameters<typeof createAccount>[1] = {},
  ): Promise<Actor> {
    const account = await createAccount(app, overrides);
    return { account, token: await login(account.email) };
  }

  function api(token?: string) {
    const server = app.getHttpServer();
    const auth = (r: request.Test) =>
      token ? r.set('Authorization', `Bearer ${token}`) : r;
    return {
      list: (projectId: string, query: Record<string, string | number> = {}) =>
        auth(request(server).get(`/projects/${projectId}/tasks`)).query(query),
      create: (projectId: string, body: object) =>
        auth(request(server).post(`/projects/${projectId}/tasks`)).send(body),
      get: (id: string) => auth(request(server).get(`/tasks/${id}`)),
      update: (id: string, body: object) =>
        auth(request(server).patch(`/tasks/${id}`)).send(body),
      remove: (id: string) => auth(request(server).delete(`/tasks/${id}`)),
      changeStatus: (id: string, body: object) =>
        auth(request(server).put(`/tasks/${id}/status`)).send(body),
    };
  }

  /** Um projeto com Gestor, Membro e um Administrador que não é membro. */
  async function team(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
    const manager = await accountWithToken({ name: 'Ana Gestora' });
    const member = await accountWithToken({ name: 'Bruno Membro' });
    const outsiderAdmin = await accountWithToken({
      isAdmin: true,
      name: 'Administrador',
    });
    const project = await createProject(
      app,
      [
        { accountId: manager.account.id, role: 'MANAGER' },
        { accountId: member.account.id, role: 'MEMBER' },
      ],
      status,
    );
    return { manager, member, outsiderAdmin, project };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ------------------------------------------------------------- criar
  describe('POST /projects/{projectId}/tasks (createProjectTask, US06, US22)', () => {
    let t: Awaited<ReturnType<typeof team>>;

    beforeAll(async () => {
      t = await team();
    });

    it('cria a tarefa em "Por fazer", "Média" e "Sem responsável", com o título aparado', async () => {
      const res = await api(t.manager.token)
        .create(t.project.id, { title: '  Publicar página inicial  ' })
        .expect(201);

      expect(res.headers.location).toBe(`/tasks/${res.body.id}`);
      expect(res.body).toEqual({
        id: expect.any(String),
        projectId: t.project.id,
        title: 'Publicar página inicial',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        assignee: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(saved.title).toBe('Publicar página inicial');
    });

    it('cria a tarefa com descrição, prioridade e um responsável membro do projeto', async () => {
      const res = await api(t.manager.token)
        .create(t.project.id, {
          title: 'Rever textos',
          description: 'Rever os textos da página inicial.',
          priority: 'HIGH',
          assigneeId: t.member.account.id,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'Rever textos',
        description: 'Rever os textos da página inicial.',
        status: 'TODO',
        priority: 'HIGH',
        assignee: {
          id: t.member.account.id,
          name: 'Bruno Membro',
          status: 'ACTIVE',
          isProjectMember: true,
        },
      });
    });

    it('uma descrição só com espaços fica null', async () => {
      const res = await api(t.manager.token)
        .create(t.project.id, { title: 'Sem descrição', description: '   ' })
        .expect(201);
      expect(res.body.description).toBeNull();
    });

    it.each([
      ['o estado (PN10)', { title: 'Tarefa', status: 'DONE' }],
      ['o projectId', { title: 'Tarefa', projectId: randomUUID() }],
      ['uma prioridade fora do enum', { title: 'Tarefa', priority: 'URGENT' }],
      ['uma prioridade null', { title: 'Tarefa', priority: null }],
      ['um título que não é texto', { title: 123 }],
      ['um assigneeId que não é UUID', { title: 'Tarefa', assigneeId: 'ana' }],
    ])('recusa %s com 400 VALIDATION_ERROR', async (_, body) => {
      const res = await api(t.manager.token)
        .create(t.project.id, body)
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['em falta', {}],
      ['só com espaços', { title: '     ' }],
      ['curto demais depois de aparado', { title: '  ab  ' }],
      ['longo demais', { title: 'a'.repeat(151) }],
    ])('recusa um título %s com 400 TITLE_INVALID', async (_, body) => {
      const res = await api(t.manager.token)
        .create(t.project.id, body)
        .expect(400);
      expect(res.body.code).toBe('TITLE_INVALID');
    });

    it('recusa uma descrição com mais de 2000 caracteres com DESCRIPTION_TOO_LONG', async () => {
      const res = await api(t.manager.token)
        .create(t.project.id, {
          title: 'Tarefa',
          description: 'a'.repeat(2001),
        })
        .expect(400);
      expect(res.body.code).toBe('DESCRIPTION_TOO_LONG');
    });

    it('recusa um responsável que não é membro do projeto (PN06)', async () => {
      const outsider = await createAccount(app, { name: 'Rui Externo' });
      for (const assigneeId of [outsider.id, randomUUID()]) {
        const res = await api(t.manager.token)
          .create(t.project.id, { title: 'Tarefa', assigneeId })
          .expect(400);
        expect(res.body.code).toBe('ASSIGNEE_NOT_MEMBER');
      }
    });

    it.each(['PENDING', 'DEACTIVATED'] as const)(
      'recusa um responsável membro com a conta %s (PN08, DE15)',
      async (status) => {
        const account = await createAccount(app, { status });
        await prisma.projectMember.create({
          data: {
            projectId: t.project.id,
            accountId: account.id,
            role: 'MEMBER',
          },
        });
        const res = await api(t.manager.token)
          .create(t.project.id, { title: 'Tarefa', assigneeId: account.id })
          .expect(400);
        expect(res.body.code).toBe('ASSIGNEE_NOT_ACTIVE');
      },
    );

    it('recusa o Membro com 403 NOT_PROJECT_MANAGER, mesmo com dados inválidos pelas regras', async () => {
      const before = await prisma.task.count({
        where: { projectId: t.project.id },
      });
      const res = await api(t.member.token)
        .create(t.project.id, { title: '  ' })
        .expect(403);
      expect(res.body.code).toBe('NOT_PROJECT_MANAGER');
      expect(
        await prisma.task.count({ where: { projectId: t.project.id } }),
      ).toBe(before);
    });

    it('responde 404 a um Administrador que não é membro e a um projeto que não existe', async () => {
      for (const projectId of [t.project.id, randomUUID()]) {
        const res = await api(t.outsiderAdmin.token)
          .create(projectId, { title: 'Tarefa' })
          .expect(404);
        expect(res.body.code).toBe('PROJECT_NOT_FOUND');
      }
    });

    it('responde 409 PROJECT_ARCHIVED num projeto arquivado (PN09)', async () => {
      const archived = await team('ARCHIVED');
      const res = await api(archived.manager.token)
        .create(archived.project.id, { title: 'Tarefa' })
        .expect(409);
      expect(res.body.code).toBe('PROJECT_ARCHIVED');
    });

    it('responde 401 sem sessão e 400 a um projectId inválido', async () => {
      await api().create(t.project.id, { title: 'Tarefa' }).expect(401);
      const res = await api(t.manager.token)
        .create('nao-e-uuid', { title: 'Tarefa' })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ------------------------------------------------------------- listar
  describe('GET /projects/{projectId}/tasks (listProjectTasks, US08, US23)', () => {
    let t: Awaited<ReturnType<typeof team>>;
    const ids: Record<string, string> = {};

    beforeAll(async () => {
      t = await team();
      // 6 tarefas com datas de criação fixas: 2 "Alta" (uma TODO e uma DONE).
      const base = Date.parse('2026-10-01T09:00:00Z');
      const specs = [
        ['t1', 'TODO', 'HIGH'],
        ['t2', 'TODO', 'MEDIUM'],
        ['t3', 'TODO', 'LOW'],
        ['t4', 'IN_PROGRESS', 'MEDIUM'],
        ['t5', 'DONE', 'HIGH'],
        ['t6', 'DONE', 'MEDIUM'],
      ] as const;
      for (const [i, [key, status, priority]] of specs.entries()) {
        const task = await createTask(app, t.project.id, {
          title: `Tarefa ${key}`,
          status,
          priority,
          createdAt: new Date(base + i * 60_000),
        });
        ids[key] = task.id;
      }
    });

    it('sem filtros devolve todas as tarefas por createdAt, com total e contagens', async () => {
      const res = await api(t.member.token).list(t.project.id).expect(200);
      expect(res.body.items.map((x: { id: string }) => x.id)).toEqual(
        ['t1', 't2', 't3', 't4', 't5', 't6'].map((k) => ids[k]),
      );
      expect(res.body).toMatchObject({
        total: 6,
        page: 1,
        pageSize: 20,
        countsByStatus: { todo: 3, inProgress: 1, done: 2 },
      });
    });

    it('filtra por prioridade: total e contagens com o filtro (US23)', async () => {
      const res = await api(t.member.token)
        .list(t.project.id, { priority: 'HIGH' })
        .expect(200);
      expect(res.body.items.map((x: { id: string }) => x.id)).toEqual([
        ids.t1,
        ids.t5,
      ]);
      expect(res.body.total).toBe(2);
      expect(res.body.countsByStatus).toEqual({
        todo: 1,
        inProgress: 0,
        done: 1,
      });
    });

    it('filtra por estado: as contagens ignoram o filtro de estado', async () => {
      const res = await api(t.member.token)
        .list(t.project.id, { status: 'TODO' })
        .expect(200);
      expect(res.body.items).toHaveLength(3);
      expect(res.body.total).toBe(3);
      expect(res.body.countsByStatus).toEqual({
        todo: 3,
        inProgress: 1,
        done: 2,
      });
    });

    it('combina estado e prioridade', async () => {
      const res = await api(t.member.token)
        .list(t.project.id, { status: 'DONE', priority: 'MEDIUM' })
        .expect(200);
      expect(res.body.items.map((x: { id: string }) => x.id)).toEqual([ids.t6]);
      expect(res.body.total).toBe(1);
      expect(res.body.countsByStatus).toEqual({
        todo: 1,
        inProgress: 1,
        done: 1,
      });
    });

    it('pagina: a 2.ª página de 4 traz as 2 últimas e o total continua 6', async () => {
      const res = await api(t.member.token)
        .list(t.project.id, { page: 2, pageSize: 4 })
        .expect(200);
      expect(res.body.items.map((x: { id: string }) => x.id)).toEqual([
        ids.t5,
        ids.t6,
      ]);
      expect(res.body).toMatchObject({ total: 6, page: 2, pageSize: 4 });
    });

    it('uma página para além da última devolve items vazio', async () => {
      const res = await api(t.member.token)
        .list(t.project.id, { page: 9, pageSize: 4 })
        .expect(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(6);
    });

    it('sem resultados: lista vazia e contagens a 0', async () => {
      const empty = await team();
      const res = await api(empty.member.token)
        .list(empty.project.id)
        .expect(200);
      expect(res.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        countsByStatus: { todo: 0, inProgress: 0, done: 0 },
      });
    });

    it.each([
      ['status fora do enum', { status: 'OPEN' }],
      ['priority fora do enum', { priority: 'urgent' }],
      ['page 0', { page: 0 }],
      ['page que não é inteiro', { page: '1.5' }],
      ['pageSize acima de 100', { pageSize: 101 }],
      ['pageSize 0', { pageSize: 0 }],
      ['parâmetro desconhecido', { assignee: 'ana' }],
    ])('recusa %s com 400 VALIDATION_ERROR', async (_, query) => {
      const res = await api(t.member.token)
        .list(t.project.id, query)
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('responde 404 a um Administrador que não é membro (PN02, CL6)', async () => {
      const res = await api(t.outsiderAdmin.token)
        .list(t.project.id)
        .expect(404);
      expect(res.body.code).toBe('PROJECT_NOT_FOUND');
    });

    it('um projeto arquivado continua legível (PN09)', async () => {
      const archived = await team('ARCHIVED');
      await createTask(app, archived.project.id);
      const res = await api(archived.member.token)
        .list(archived.project.id)
        .expect(200);
      expect(res.body.total).toBe(1);
    });

    it('mostra "já não é membro" numa tarefa "Concluída" de quem saiu do projeto (PN07)', async () => {
      const gone = await createAccount(app, { name: 'Rui Saiu' });
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        priority: 'LOW',
        assigneeId: gone.id,
      });
      const res = await api(t.member.token)
        .list(t.project.id, { status: 'DONE', priority: 'LOW' })
        .expect(200);
      expect(res.body.items).toEqual([
        expect.objectContaining({
          id: task.id,
          assignee: {
            id: gone.id,
            name: 'Rui Saiu',
            status: 'ACTIVE',
            isProjectMember: false,
          },
        }),
      ]);
    });
  });

  // ------------------------------------------------------------- consultar
  describe('GET /tasks/{taskId} (getTask, US19)', () => {
    it('qualquer membro vê a tarefa; quem não é membro recebe 404', async () => {
      const t = await team();
      const task = await createTask(app, t.project.id, {
        title: 'Rever textos',
        assigneeId: t.member.account.id,
      });

      const res = await api(t.member.token).get(task.id).expect(200);
      expect(res.body).toMatchObject({
        id: task.id,
        projectId: t.project.id,
        title: 'Rever textos',
        status: 'TODO',
        priority: 'MEDIUM',
        assignee: { id: t.member.account.id, isProjectMember: true },
      });

      for (const id of [task.id, randomUUID()]) {
        const notFound = await api(t.outsiderAdmin.token).get(id).expect(404);
        expect(notFound.body.code).toBe('TASK_NOT_FOUND');
      }
      await api().get(task.id).expect(401);
      await api(t.member.token).get('nao-e-uuid').expect(400);
    });
  });

  // ------------------------------------------------------------- editar
  describe('PATCH /tasks/{taskId} (updateTask, US06, US22)', () => {
    let t: Awaited<ReturnType<typeof team>>;

    beforeAll(async () => {
      t = await team();
    });

    it('muda o título (aparado) e mantém o responsável, o estado e a prioridade', async () => {
      const task = await createTask(app, t.project.id, {
        title: 'Rever textos',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeId: t.member.account.id,
      });
      const res = await api(t.manager.token)
        .update(task.id, { title: '  Rever textos da página inicial ' })
        .expect(200);
      expect(res.body).toMatchObject({
        id: task.id,
        title: 'Rever textos da página inicial',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignee: { id: t.member.account.id },
      });
    });

    it('muda a prioridade, limpa a descrição e deixa "Sem responsável"', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeId: t.member.account.id,
      });
      await prisma.task.update({
        where: { id: task.id },
        data: { description: 'Antiga' },
      });
      const res = await api(t.manager.token)
        .update(task.id, { priority: 'LOW', description: '', assigneeId: null })
        .expect(200);
      expect(res.body).toMatchObject({
        priority: 'LOW',
        description: null,
        assignee: null,
      });
    });

    it('aceita reenviar o responsável atual de uma tarefa "Concluída" de quem saiu do projeto', async () => {
      const gone = await createAccount(app, { name: 'Rui Saiu' });
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeId: gone.id,
      });
      const res = await api(t.manager.token)
        .update(task.id, { title: 'Novo título', assigneeId: gone.id })
        .expect(200);
      expect(res.body.assignee).toMatchObject({
        id: gone.id,
        isProjectMember: false,
      });
    });

    it('recusa um novo responsável fora do projeto e mantém o atual', async () => {
      const outsider = await createAccount(app);
      const task = await createTask(app, t.project.id, {
        assigneeId: t.member.account.id,
      });
      const res = await api(t.manager.token)
        .update(task.id, { assigneeId: outsider.id })
        .expect(400);
      expect(res.body.code).toBe('ASSIGNEE_NOT_MEMBER');
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(saved.assigneeId).toBe(t.member.account.id);
    });

    it.each([
      ['um corpo vazio', {}],
      [
        'o projectId (não se muda a tarefa de projeto)',
        { projectId: randomUUID() },
      ],
      ['o estado (muda-se com PUT /status)', { status: 'DONE' }],
      ['uma prioridade fora do enum', { priority: 'high' }],
      ['um título null', { title: null }],
    ])('recusa %s com 400 VALIDATION_ERROR', async (_, body) => {
      const task = await createTask(app, t.project.id);
      const res = await api(t.manager.token).update(task.id, body).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(saved.projectId).toBe(t.project.id);
    });

    it('recusa um título só com espaços com TITLE_INVALID', async () => {
      const task = await createTask(app, t.project.id);
      const res = await api(t.manager.token)
        .update(task.id, { title: '   ' })
        .expect(400);
      expect(res.body.code).toBe('TITLE_INVALID');
    });

    it('recusa o Membro com 403 e não muda a tarefa', async () => {
      const task = await createTask(app, t.project.id, { title: 'Original' });
      const res = await api(t.member.token)
        .update(task.id, { title: 'Alterado', priority: 'HIGH' })
        .expect(403);
      expect(res.body.code).toBe('NOT_PROJECT_MANAGER');
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(saved).toMatchObject({ title: 'Original', priority: 'MEDIUM' });
    });

    it('responde 404 a quem não é membro e 409 num projeto arquivado', async () => {
      const task = await createTask(app, t.project.id);
      const notFound = await api(t.outsiderAdmin.token)
        .update(task.id, { title: 'Alterado' })
        .expect(404);
      expect(notFound.body.code).toBe('TASK_NOT_FOUND');

      const archived = await team('ARCHIVED');
      const archivedTask = await createTask(app, archived.project.id);
      const res = await api(archived.manager.token)
        .update(archivedTask.id, { priority: 'HIGH' })
        .expect(409);
      expect(res.body.code).toBe('PROJECT_ARCHIVED');
    });
  });

  // ------------------------------------------------------------- estado
  describe('PUT /tasks/{taskId}/status (changeTaskStatus, US07)', () => {
    let t: Awaited<ReturnType<typeof team>>;

    beforeAll(async () => {
      t = await team();
    });

    it('o Membro muda o estado e a tarefa mantém o resto; as contagens mudam', async () => {
      const task = await createTask(app, t.project.id, {
        title: 'Rever textos',
        priority: 'HIGH',
        assigneeId: t.member.account.id,
      });

      const res = await api(t.member.token)
        .changeStatus(task.id, { status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: task.id,
        title: 'Rever textos',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignee: { id: t.member.account.id, isProjectMember: true },
      });
      const list = await api(t.member.token)
        .list(t.project.id, { status: 'IN_PROGRESS' })
        .expect(200);
      expect(list.body.items.map((i: { id: string }) => i.id)).toContain(task.id);
    });

    it('reabrir mantém o responsável que continua membro com a conta ativa', async () => {
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeId: t.member.account.id,
      });
      const res = await api(t.manager.token)
        .changeStatus(task.id, { status: 'TODO' })
        .expect(200);
      expect(res.body.status).toBe('TODO');
      expect(res.body.assignee).toMatchObject({ id: t.member.account.id });
    });

    it('reabrir uma tarefa de quem já não é membro deixa-a "Sem responsável" (PN07, PN10)', async () => {
      const gone = await createAccount(app, { name: 'Rui Saiu' });
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeId: gone.id,
      });
      const res = await api(t.member.token)
        .changeStatus(task.id, { status: 'IN_PROGRESS' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'IN_PROGRESS', assignee: null });
    });

    it('reabrir uma tarefa de uma conta desativada deixa-a "Sem responsável" (PN08, PN10)', async () => {
      const rui = await createAccount(app, {
        name: 'Rui Desativado',
        status: 'DEACTIVATED',
      });
      await prisma.projectMember.create({
        data: { projectId: t.project.id, accountId: rui.id, role: 'MEMBER' },
      });
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeId: rui.id,
      });
      const res = await api(t.member.token)
        .changeStatus(task.id, { status: 'IN_PROGRESS' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'IN_PROGRESS', assignee: null });
    });

    it('recusa estados inválidos e campos a mais com 400 VALIDATION_ERROR', async () => {
      const task = await createTask(app, t.project.id);
      for (const body of [{}, { status: 'CLOSED' }, { status: 'DONE', title: 'x' }]) {
        const res = await api(t.member.token)
          .changeStatus(task.id, body)
          .expect(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }
      const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(saved.status).toBe('TODO');
    });

    it('responde 404 a quem não é membro, 409 num projeto arquivado e 401 sem sessão', async () => {
      const task = await createTask(app, t.project.id);
      const notFound = await api(t.outsiderAdmin.token)
        .changeStatus(task.id, { status: 'DONE' })
        .expect(404);
      expect(notFound.body.code).toBe('TASK_NOT_FOUND');

      const archived = await team('ARCHIVED');
      const archivedTask = await createTask(app, archived.project.id);
      const conflict = await api(archived.member.token)
        .changeStatus(archivedTask.id, { status: 'DONE' })
        .expect(409);
      expect(conflict.body.code).toBe('PROJECT_ARCHIVED');
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: archivedTask.id },
      });
      expect(saved.status).toBe('TODO');

      await api().changeStatus(task.id, { status: 'DONE' }).expect(401);
    });
  });

  // ------------------------------------------------------------- eliminar
  describe('DELETE /tasks/{taskId} (deleteTask, US06)', () => {
    it('o Gestor elimina a tarefa e os seus comentários; o progresso passa a contar menos uma', async () => {
      const t = await team();
      const tasks = await Promise.all(
        [1, 2, 3, 4].map(() => createTask(app, t.project.id)),
      );
      await createComment(app, tasks[0].id, t.member.account.id);

      await api(t.manager.token).remove(tasks[0].id).expect(204, '');

      await api(t.manager.token).get(tasks[0].id).expect(404);
      expect(
        await prisma.comment.count({ where: { taskId: tasks[0].id } }),
      ).toBe(0);
      const list = await api(t.member.token).list(t.project.id).expect(200);
      expect(list.body.total).toBe(3);
      const project = await request(app.getHttpServer())
        .get(`/projects/${t.project.id}`)
        .set('Authorization', `Bearer ${t.member.token}`)
        .expect(200);
      expect(project.body.progress.total).toBe(3);
    });

    it('recusa o Membro (CL2), responde 404 a quem não é membro e 409 num projeto arquivado', async () => {
      const t = await team();
      const task = await createTask(app, t.project.id);

      const forbidden = await api(t.member.token).remove(task.id).expect(403);
      expect(forbidden.body.code).toBe('NOT_PROJECT_MANAGER');
      const notFound = await api(t.outsiderAdmin.token)
        .remove(task.id)
        .expect(404);
      expect(notFound.body.code).toBe('TASK_NOT_FOUND');
      expect(await prisma.task.count({ where: { id: task.id } })).toBe(1);

      const archived = await team('ARCHIVED');
      const archivedTask = await createTask(app, archived.project.id);
      const conflict = await api(archived.manager.token)
        .remove(archivedTask.id)
        .expect(409);
      expect(conflict.body.code).toBe('PROJECT_ARCHIVED');
      await api().remove(task.id).expect(401);
    });
  });

  /**
   * O projeto é arquivado depois da verificação do controlador
   * (`requireWritable`) e antes da escrita: a escrita tem de ver o estado
   * atual do projeto e responder `409` (PN09), em vez de escrever num projeto
   * só de leitura.
   */
  describe('projeto arquivado a meio do pedido (PN09)', () => {
    async function archivedAfterCheck() {
      const { member, project } = await team();
      const task = await createTask(app, project.id, {
        title: 'Tarefa antiga',
      });
      // Acesso tal como o controlador o viu: projeto ainda ativo.
      const access: ProjectAccess = {
        projectId: project.id,
        role: 'MANAGER',
        projectStatus: 'ACTIVE',
      };
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'ARCHIVED' },
      });
      return { access, member, task, tasks: app.get(TasksService) };
    }

    async function expectArchived(write: Promise<unknown>) {
      await expect(write).rejects.toMatchObject({
        status: 409,
        code: 'PROJECT_ARCHIVED',
      });
    }

    it('não cria a tarefa', async () => {
      const { access, member, tasks } = await archivedAfterCheck();
      await expectArchived(
        tasks.create(access, {
          title: 'Tarefa nova',
          assigneeId: member.account.id,
        }),
      );
      const count = await prisma.task.count({
        where: { projectId: access.projectId },
      });
      expect(count).toBe(1);
    });

    it('não edita a tarefa', async () => {
      const { access, task, tasks } = await archivedAfterCheck();
      await expectArchived(
        tasks.update({ ...access, taskId: task.id }, { title: 'Alterada' }),
      );
      const stored = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(stored.title).toBe('Tarefa antiga');
    });

    it('não elimina a tarefa', async () => {
      const { access, task, tasks } = await archivedAfterCheck();
      await expectArchived(tasks.remove({ ...access, taskId: task.id }));
      expect(
        await prisma.task.findUnique({ where: { id: task.id } }),
      ).not.toBeNull();
    });

    it('espera por um arquivo ainda por confirmar e responde 409', async () => {
      const { project } = await team();
      const task = await createTask(app, project.id, {
        title: 'Tarefa antiga',
      });
      const tasks = app.get(TasksService);
      const access = {
        projectId: project.id,
        role: 'MANAGER' as const,
        projectStatus: 'ACTIVE' as const,
        taskId: task.id,
      };
      let archived!: () => void;
      const archiveDone = new Promise<void>((r) => (archived = r));
      let releaseArchive!: () => void;
      const hold = new Promise<void>((r) => (releaseArchive = r));

      // Arquivar numa transação que fica aberta até a escrita começar.
      const archiving = prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: project.id },
          data: { status: 'ARCHIVED' },
        });
        archived();
        await hold;
      });
      await archiveDone;

      const writes = [
        tasks.create(access, { title: 'Tarefa nova' }),
        tasks.update(access, { title: 'Alterada' }),
      ].map((p) =>
        p.then(
          () => 'escreveu',
          (e: { code?: string }) => e.code,
        ),
      );
      setTimeout(releaseArchive, 200);
      await archiving;

      expect(await Promise.all(writes)).toEqual([
        'PROJECT_ARCHIVED',
        'PROJECT_ARCHIVED',
      ]);
      const stored = await prisma.task.findMany({
        where: { projectId: project.id },
      });
      expect(stored.map((t) => t.title)).toEqual(['Tarefa antiga']);
    });
  });
});
