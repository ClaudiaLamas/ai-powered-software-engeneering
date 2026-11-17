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
 * eliminar, mudar o estado, atribuir e remover responsáveis e listar quem pode
 * ser responsável (US06, US07, US08, US19, US22, US23; DE16; openapi.yaml
 * 0.5.0).
 */
/** Um UUID fixo, para repetir o mesmo id num pedido. */
const ID_A = randomUUID();

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
      addAssignee: (id: string, body: object) =>
        auth(request(server).post(`/tasks/${id}/assignees`)).send(body),
      removeAssignee: (id: string, accountId: string) =>
        auth(request(server).delete(`/tasks/${id}/assignees/${accountId}`)),
      assignable: (projectId: string) =>
        auth(request(server).get(`/projects/${projectId}/assignable-accounts`)),
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
        assignees: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(saved.title).toBe('Publicar página inicial');
    });

    it('cria a tarefa com descrição, prioridade e dois responsáveis, por ordem do nome (DE16)', async () => {
      const res = await api(t.manager.token)
        .create(t.project.id, {
          title: 'Rever textos',
          description: 'Rever os textos da página inicial.',
          priority: 'HIGH',
          assigneeIds: [t.member.account.id, t.manager.account.id],
        })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'Rever textos',
        description: 'Rever os textos da página inicial.',
        status: 'TODO',
        priority: 'HIGH',
        assignees: [
          {
            id: t.manager.account.id,
            name: 'Ana Gestora',
            status: 'ACTIVE',
            isProjectMember: true,
          },
          {
            id: t.member.account.id,
            name: 'Bruno Membro',
            status: 'ACTIVE',
            isProjectMember: true,
          },
        ],
      });
    });

    it('recusa o mesmo membro em minúsculas e maiúsculas com 400 e não cria a tarefa (DE16)', async () => {
      const before = await prisma.task.count({
        where: { projectId: t.project.id },
      });
      const id = t.member.account.id;
      const res = await api(t.manager.token)
        .create(t.project.id, {
          title: 'Tarefa repetida',
          assigneeIds: [id.toLowerCase(), id.toUpperCase()],
        })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(
        await prisma.task.count({ where: { projectId: t.project.id } }),
      ).toBe(before);
    });

    it('com assigneeIds vazio, a tarefa fica "Sem responsável"', async () => {
      const res = await api(t.manager.token)
        .create(t.project.id, { title: 'Sem ninguém', assigneeIds: [] })
        .expect(201);
      expect(res.body.assignees).toEqual([]);
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
      ['um assigneeIds com um id que não é UUID', { title: 'Tarefa', assigneeIds: ['ana'] }],
      ['um assigneeIds que não é lista', { title: 'Tarefa', assigneeIds: randomUUID() }],
      ['um assigneeIds com repetidos', { title: 'Tarefa', assigneeIds: [ID_A, ID_A] }],
      [
        'um assigneeIds com o mesmo id em minúsculas e maiúsculas',
        { title: 'Tarefa', assigneeIds: [ID_A, ID_A.toUpperCase()] },
      ],
      ['um assigneeIds com um elemento que não é texto', { title: 'Tarefa', assigneeIds: [ID_A, 1] }],
      ['o antigo assigneeId (0.4.0)', { title: 'Tarefa', assigneeId: randomUUID() }],
    ])('recusa %s com 400 VALIDATION_ERROR', async (_, body) => {
      const res = await api(t.manager.token)
        .create(t.project.id, body)
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['no título', 'title', { title: 'Rever\u0000textos' }],
      ['na descrição', 'description', { title: 'Rever textos', description: 'a\u0000' }],
    ])(
      'recusa o carácter nulo %s com 400 VALIDATION_ERROR, não 500, e não cria nada',
      async (_, field, body) => {
        const before = await prisma.task.count({
          where: { projectId: t.project.id },
        });
        const res = await api(t.manager.token)
          .create(t.project.id, body)
          .expect(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.errors).toEqual([
          { field, message: 'O texto tem um carácter inválido.' },
        ]);
        expect(
          await prisma.task.count({ where: { projectId: t.project.id } }),
        ).toBe(before);
      },
    );

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

    it('recusa um responsável que não é membro do projeto (PN06) e não cria a tarefa', async () => {
      const outsider = await createAccount(app, { name: 'Rui Externo' });
      const before = await prisma.task.count({
        where: { projectId: t.project.id },
      });
      for (const accountId of [outsider.id, randomUUID()]) {
        const res = await api(t.manager.token)
          .create(t.project.id, {
            title: 'Tarefa',
            assigneeIds: [t.member.account.id, accountId],
          })
          .expect(400);
        expect(res.body.code).toBe('ASSIGNEE_NOT_MEMBER');
        expect(res.body.errors).toEqual([
          { field: 'assigneeIds', message: expect.any(String) },
        ]);
      }
      expect(
        await prisma.task.count({ where: { projectId: t.project.id } }),
      ).toBe(before);
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
          .create(t.project.id, { title: 'Tarefa', assigneeIds: [account.id] })
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
        assigneeIds: [gone.id],
      });
      const res = await api(t.member.token)
        .list(t.project.id, { status: 'DONE', priority: 'LOW' })
        .expect(200);
      expect(res.body.items).toEqual([
        expect.objectContaining({
          id: task.id,
          assignees: [
            {
              id: gone.id,
              name: 'Rui Saiu',
              status: 'ACTIVE',
              isProjectMember: false,
            },
          ],
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
        assigneeIds: [t.member.account.id],
      });

      const res = await api(t.member.token).get(task.id).expect(200);
      expect(res.body).toMatchObject({
        id: task.id,
        projectId: t.project.id,
        title: 'Rever textos',
        status: 'TODO',
        priority: 'MEDIUM',
        assignees: [{ id: t.member.account.id, isProjectMember: true }],
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

    it('muda o título (aparado) e mantém os responsáveis, o estado e a prioridade', async () => {
      const task = await createTask(app, t.project.id, {
        title: 'Rever textos',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeIds: [t.member.account.id],
      });
      const res = await api(t.manager.token)
        .update(task.id, { title: '  Rever textos da página inicial ' })
        .expect(200);
      expect(res.body).toMatchObject({
        id: task.id,
        title: 'Rever textos da página inicial',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignees: [{ id: t.member.account.id }],
      });
    });

    it.each([
      ['no título', { title: 'Novo\u0000' }],
      ['na descrição', { description: '\u0000' }],
    ])(
      'recusa o carácter nulo %s com 400 VALIDATION_ERROR, não 500, e não muda a tarefa',
      async (_, body) => {
        const task = await createTask(app, t.project.id, {
          title: 'Rever textos',
        });
        const res = await api(t.manager.token)
          .update(task.id, body)
          .expect(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(
          await prisma.task.findUniqueOrThrow({ where: { id: task.id } }),
        ).toMatchObject({ title: 'Rever textos', description: null });
      },
    );

    it('muda a prioridade e limpa a descrição, sem mexer nos responsáveis', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.member.account.id],
      });
      await prisma.task.update({
        where: { id: task.id },
        data: { description: 'Antiga' },
      });
      const res = await api(t.manager.token)
        .update(task.id, { priority: 'LOW', description: '' })
        .expect(200);
      expect(res.body).toMatchObject({
        priority: 'LOW',
        description: null,
        assignees: [{ id: t.member.account.id }],
      });
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
      ['o antigo assigneeId (0.4.0)', { assigneeId: null }],
      ['assigneeIds (mudam-se com /assignees)', { assigneeIds: [] }],
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
        assigneeIds: [t.member.account.id],
      });

      const res = await api(t.member.token)
        .changeStatus(task.id, { status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: task.id,
        title: 'Rever textos',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignees: [{ id: t.member.account.id, isProjectMember: true }],
      });
      const list = await api(t.member.token)
        .list(t.project.id, { status: 'IN_PROGRESS' })
        .expect(200);
      expect(list.body.items.map((i: { id: string }) => i.id)).toContain(task.id);
    });

    it('reabrir mantém o responsável que continua membro com a conta ativa', async () => {
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeIds: [t.member.account.id],
      });
      const res = await api(t.manager.token)
        .changeStatus(task.id, { status: 'TODO' })
        .expect(200);
      expect(res.body.status).toBe('TODO');
      expect(res.body.assignees).toMatchObject([{ id: t.member.account.id }]);
    });

    it('reabrir uma tarefa só de quem já não é membro deixa-a "Sem responsável" (PN07, PN10)', async () => {
      const gone = await createAccount(app, { name: 'Rui Saiu' });
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeIds: [gone.id],
      });
      const res = await api(t.member.token)
        .changeStatus(task.id, { status: 'IN_PROGRESS' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'IN_PROGRESS', assignees: [] });
    });

    it('reabrir tira só quem já não é membro e mantém os outros responsáveis (DE14, DE16)', async () => {
      const gone = await createAccount(app, { name: 'Rui Saiu' });
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeIds: [gone.id, t.member.account.id],
      });
      const res = await api(t.member.token)
        .changeStatus(task.id, { status: 'TODO' })
        .expect(200);
      expect(res.body.assignees).toEqual([
        expect.objectContaining({ id: t.member.account.id }),
      ]);
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(1);
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
        assigneeIds: [rui.id],
      });
      const res = await api(t.member.token)
        .changeStatus(task.id, { status: 'IN_PROGRESS' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'IN_PROGRESS', assignees: [] });
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
      await prisma.taskAssignee.create({
        data: { taskId: tasks[0].id, accountId: t.member.account.id },
      });

      await api(t.manager.token).remove(tasks[0].id).expect(204, '');

      await api(t.manager.token).get(tasks[0].id).expect(404);
      expect(
        await prisma.comment.count({ where: { taskId: tasks[0].id } }),
      ).toBe(0);
      expect(
        await prisma.taskAssignee.count({ where: { taskId: tasks[0].id } }),
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

  // ------------------------------------------------- atribuir responsável
  describe('POST /tasks/{taskId}/assignees (addTaskAssignee, US06, DE16)', () => {
    let t: Awaited<ReturnType<typeof team>>;

    beforeAll(async () => {
      t = await team();
    });

    it('o Gestor atribui mais um responsável; a lista fica por ordem do nome', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.member.account.id],
      });
      const res = await api(t.manager.token)
        .addAssignee(task.id, { accountId: t.manager.account.id })
        .expect(201);
      expect(res.body).toMatchObject({
        id: task.id,
        assignees: [
          { id: t.manager.account.id, name: 'Ana Gestora', isProjectMember: true },
          { id: t.member.account.id, name: 'Bruno Membro', isProjectMember: true },
        ],
      });
      const got = await api(t.member.token).get(task.id).expect(200);
      expect(got.body).toEqual(res.body);
    });

    it('atribui também numa tarefa "Concluída"', async () => {
      const task = await createTask(app, t.project.id, { status: 'DONE' });
      const res = await api(t.manager.token)
        .addAssignee(task.id, { accountId: t.member.account.id })
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'DONE',
        assignees: [{ id: t.member.account.id }],
      });
    });

    it('recusa um responsável repetido com 409 ASSIGNEE_ALREADY_ASSIGNED', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.member.account.id],
      });
      const res = await api(t.manager.token)
        .addAssignee(task.id, { accountId: t.member.account.id })
        .expect(409);
      expect(res.body.code).toBe('ASSIGNEE_ALREADY_ASSIGNED');
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(1);
    });

    it('um repetido que só a restrição única da base de dados apanha dá 409, não 500', async () => {
      const task = await createTask(app, t.project.id);
      // Simula o repetido a chegar à base de dados: depois da verificação
      // prévia, insere a mesma linha na transação, antes do create do serviço.
      type Assignable = {
        requireAssignable: (
          tx: PrismaService,
          ...rest: unknown[]
        ) => Promise<void>;
      };
      const service = app.get(TasksService) as unknown as Assignable;
      const original = service.requireAssignable.bind(service);
      const spy = vi
        .spyOn(service, 'requireAssignable')
        .mockImplementationOnce(async (tx, ...rest) => {
          await original(tx, ...rest);
          await tx.taskAssignee.create({
            data: { taskId: task.id, accountId: t.member.account.id },
          });
        });
      try {
        const res = await api(t.manager.token)
          .addAssignee(task.id, { accountId: t.member.account.id })
          .expect(409);
        expect(res.body.code).toBe('ASSIGNEE_ALREADY_ASSIGNED');
        expect(spy).toHaveBeenCalledOnce();
      } finally {
        spy.mockRestore();
      }
      // A transação foi desfeita: nem a linha simulada ficou.
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(0);
    });

    it('dois pedidos iguais ao mesmo tempo: um atribui, o outro dá 409', async () => {
      const task = await createTask(app, t.project.id);
      const results = await Promise.all(
        [1, 2].map(() =>
          api(t.manager.token).addAssignee(task.id, {
            accountId: t.member.account.id,
          }),
        ),
      );
      expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(1);
    });

    it('recusa quem não é membro e uma conta que não existe com 400 ASSIGNEE_NOT_MEMBER', async () => {
      const outsider = await createAccount(app, { name: 'Rui Externo' });
      const task = await createTask(app, t.project.id);
      for (const accountId of [outsider.id, randomUUID()]) {
        const res = await api(t.manager.token)
          .addAssignee(task.id, { accountId })
          .expect(400);
        expect(res.body).toMatchObject({
          code: 'ASSIGNEE_NOT_MEMBER',
          errors: [{ field: 'accountId', message: expect.any(String) }],
        });
      }
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(0);
    });

    it.each(['PENDING', 'DEACTIVATED'] as const)(
      'recusa um membro com a conta %s com 400 ASSIGNEE_NOT_ACTIVE (PN08, DE15)',
      async (status) => {
        const account = await createAccount(app, { status });
        await prisma.projectMember.create({
          data: { projectId: t.project.id, accountId: account.id, role: 'MEMBER' },
        });
        const task = await createTask(app, t.project.id);
        const res = await api(t.manager.token)
          .addAssignee(task.id, { accountId: account.id })
          .expect(400);
        expect(res.body.code).toBe('ASSIGNEE_NOT_ACTIVE');
      },
    );

    it.each([
      ['um corpo vazio', {}],
      ['um accountId que não é UUID', { accountId: 'ana' }],
      ['um campo a mais', { accountId: ID_A, role: 'MEMBER' }],
    ])('recusa %s com 400 VALIDATION_ERROR', async (_, body) => {
      const task = await createTask(app, t.project.id);
      const res = await api(t.manager.token)
        .addAssignee(task.id, body)
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('recusa o Membro com 403 NOT_PROJECT_MANAGER, mesmo a atribuir-se a si próprio', async () => {
      const task = await createTask(app, t.project.id);
      const res = await api(t.member.token)
        .addAssignee(task.id, { accountId: t.member.account.id })
        .expect(403);
      expect(res.body.code).toBe('NOT_PROJECT_MANAGER');
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(0);
    });

    it('responde 404 a quem não é membro, 409 num projeto arquivado e 401 sem sessão', async () => {
      const task = await createTask(app, t.project.id);
      for (const id of [task.id, randomUUID()]) {
        const res = await api(t.outsiderAdmin.token)
          .addAssignee(id, { accountId: t.member.account.id })
          .expect(404);
        expect(res.body.code).toBe('TASK_NOT_FOUND');
      }

      const archived = await team('ARCHIVED');
      const archivedTask = await createTask(app, archived.project.id);
      const conflict = await api(archived.manager.token)
        .addAssignee(archivedTask.id, { accountId: archived.member.account.id })
        .expect(409);
      expect(conflict.body.code).toBe('PROJECT_ARCHIVED');

      await api()
        .addAssignee(task.id, { accountId: t.member.account.id })
        .expect(401);
    });

    it('num projeto arquivado, o 409 vem antes das regras do responsável', async () => {
      const archived = await team('ARCHIVED');
      const archivedTask = await createTask(app, archived.project.id);
      const res = await api(archived.manager.token)
        .addAssignee(archivedTask.id, { accountId: randomUUID() })
        .expect(409);
      expect(res.body.code).toBe('PROJECT_ARCHIVED');
    });
  });

  // ------------------------------------------------- remover responsável
  describe('DELETE /tasks/{taskId}/assignees/{accountId} (removeTaskAssignee, US06)', () => {
    let t: Awaited<ReturnType<typeof team>>;

    beforeAll(async () => {
      t = await team();
    });

    it('o Gestor remove um responsável e os outros mantêm-se', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.manager.account.id, t.member.account.id],
      });
      await api(t.manager.token)
        .removeAssignee(task.id, t.member.account.id)
        .expect(204, '');
      const got = await api(t.member.token).get(task.id).expect(200);
      expect(got.body.assignees).toEqual([
        expect.objectContaining({ id: t.manager.account.id }),
      ]);
    });

    it('remover um de três mantém os outros dois, pela mesma ordem, também na base de dados', async () => {
      const carla = await createAccount(app, { name: 'Carla Membro' });
      await prisma.projectMember.create({
        data: { projectId: t.project.id, accountId: carla.id, role: 'MEMBER' },
      });
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.manager.account.id, t.member.account.id, carla.id],
      });

      await api(t.manager.token)
        .removeAssignee(task.id, t.member.account.id)
        .expect(204);

      const got = await api(t.manager.token).get(task.id).expect(200);
      expect(got.body.assignees.map((a: { id: string }) => a.id)).toEqual([
        t.manager.account.id,
        carla.id,
      ]);
      const rows = await prisma.taskAssignee.findMany({
        where: { taskId: task.id },
        select: { accountId: true },
      });
      expect(rows.map((r) => r.accountId).sort()).toEqual(
        [t.manager.account.id, carla.id].sort(),
      );
    });

    it('sem responsáveis, a tarefa fica "Sem responsável"', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.member.account.id],
      });
      await api(t.manager.token)
        .removeAssignee(task.id, t.member.account.id)
        .expect(204);
      const got = await api(t.member.token).get(task.id).expect(200);
      expect(got.body.assignees).toEqual([]);
    });

    it('remove de uma tarefa "Concluída" quem já não é membro (DE14)', async () => {
      const gone = await createAccount(app, { name: 'Rui Saiu' });
      const task = await createTask(app, t.project.id, {
        status: 'DONE',
        assigneeIds: [gone.id],
      });
      await api(t.manager.token).removeAssignee(task.id, gone.id).expect(204);
      const got = await api(t.member.token).get(task.id).expect(200);
      expect(got.body).toMatchObject({ status: 'DONE', assignees: [] });
    });

    it('responde 404 ASSIGNEE_NOT_FOUND a quem não é responsável da tarefa', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.manager.account.id],
      });
      for (const accountId of [t.member.account.id, randomUUID()]) {
        const res = await api(t.manager.token)
          .removeAssignee(task.id, accountId)
          .expect(404);
        expect(res.body.code).toBe('ASSIGNEE_NOT_FOUND');
      }
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(1);
    });

    it('recusa o Membro com 403 e não remove ninguém', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.member.account.id],
      });
      const res = await api(t.member.token)
        .removeAssignee(task.id, t.member.account.id)
        .expect(403);
      expect(res.body.code).toBe('NOT_PROJECT_MANAGER');
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(1);
    });

    it('responde 404 a quem não é membro, 409 num projeto arquivado, 400 a um id inválido e 401 sem sessão', async () => {
      const task = await createTask(app, t.project.id, {
        assigneeIds: [t.member.account.id],
      });
      const notFound = await api(t.outsiderAdmin.token)
        .removeAssignee(task.id, t.member.account.id)
        .expect(404);
      expect(notFound.body.code).toBe('TASK_NOT_FOUND');

      const archived = await team('ARCHIVED');
      const archivedTask = await createTask(app, archived.project.id, {
        assigneeIds: [archived.member.account.id],
      });
      const conflict = await api(archived.manager.token)
        .removeAssignee(archivedTask.id, archived.member.account.id)
        .expect(409);
      expect(conflict.body.code).toBe('PROJECT_ARCHIVED');
      expect(
        await prisma.taskAssignee.count({ where: { taskId: archivedTask.id } }),
      ).toBe(1);

      const invalid = await api(t.manager.token)
        .removeAssignee(task.id, 'nao-e-uuid')
        .expect(400);
      expect(invalid.body.code).toBe('VALIDATION_ERROR');
      await api().removeAssignee(task.id, t.member.account.id).expect(401);
    });
  });

  // ------------------------------------------- quem pode ser responsável
  describe('GET /projects/{projectId}/assignable-accounts (listAssignableAccounts, US06)', () => {
    it('lista só os membros com conta ativa, por ordem do nome (PN06, PN08, DE15)', async () => {
      const t = await team();
      const outsider = await createAccount(app, { name: 'Aaron Externo' });
      const pending = await createAccount(app, { name: 'Pedro Pendente', status: 'PENDING' });
      const deactivated = await createAccount(app, {
        name: 'Daniel Desativado',
        status: 'DEACTIVATED',
      });
      const carla = await createAccount(app, { name: 'Carla Membro' });
      for (const account of [pending, deactivated, carla]) {
        await prisma.projectMember.create({
          data: { projectId: t.project.id, accountId: account.id, role: 'MEMBER' },
        });
      }

      const res = await api(t.manager.token).assignable(t.project.id).expect(200);
      expect(res.body).toEqual({
        items: [
          { id: t.manager.account.id, name: 'Ana Gestora', status: 'ACTIVE' },
          { id: t.member.account.id, name: 'Bruno Membro', status: 'ACTIVE' },
          { id: carla.id, name: 'Carla Membro', status: 'ACTIVE' },
        ],
      });
      expect(res.body.items.map((a: { id: string }) => a.id)).not.toContain(outsider.id);
    });

    it('um projeto arquivado continua legível (PN09)', async () => {
      const archived = await team('ARCHIVED');
      const res = await api(archived.manager.token)
        .assignable(archived.project.id)
        .expect(200);
      expect(res.body.items).toHaveLength(2);
    });

    it('recusa o Membro com 403, responde 404 a quem não é membro e 401 sem sessão', async () => {
      const t = await team();
      const forbidden = await api(t.member.token).assignable(t.project.id).expect(403);
      expect(forbidden.body.code).toBe('NOT_PROJECT_MANAGER');
      for (const projectId of [t.project.id, randomUUID()]) {
        const res = await api(t.outsiderAdmin.token).assignable(projectId).expect(404);
        expect(res.body.code).toBe('PROJECT_NOT_FOUND');
      }
      await api().assignable(t.project.id).expect(401);
    });
  });

  // ------------------------------------------------- outro utilizador
  /**
   * Uma conta ativa, sem a permissão de Administrador, que é Gestor de outro
   * projeto: não vê nem altera as tarefas de um projeto de que não é membro
   * (PN02, DE02). Responde 404, como a quem não é membro, sem revelar se o
   * projeto ou a tarefa existem.
   */
  describe('outro utilizador (Gestor de outro projeto, sem ser membro)', () => {
    let t: Awaited<ReturnType<typeof team>>;
    let other: Actor;

    beforeAll(async () => {
      t = await team();
      other = await accountWithToken({ name: 'Carla Outro Projeto' });
      await createProject(app, [
        { accountId: other.account.id, role: 'MANAGER' },
      ]);
    });

    it('não cria uma tarefa no projeto: 404 PROJECT_NOT_FOUND e nada é criado', async () => {
      const before = await prisma.task.count({
        where: { projectId: t.project.id },
      });
      const res = await api(other.token)
        .create(t.project.id, { title: 'Tarefa intrusa' })
        .expect(404);
      expect(res.body.code).toBe('PROJECT_NOT_FOUND');
      expect(
        await prisma.task.count({ where: { projectId: t.project.id } }),
      ).toBe(before);
    });

    it('não consulta, não edita, não elimina nem muda os responsáveis da tarefa pelo ID: 404 TASK_NOT_FOUND', async () => {
      const task = await createTask(app, t.project.id, {
        title: 'Original',
        priority: 'LOW',
      });

      const got = await api(other.token).get(task.id).expect(404);
      expect(got.body.code).toBe('TASK_NOT_FOUND');

      const updated = await api(other.token)
        .update(task.id, { title: 'Alterado', priority: 'HIGH' })
        .expect(404);
      expect(updated.body.code).toBe('TASK_NOT_FOUND');

      const removed = await api(other.token).remove(task.id).expect(404);
      expect(removed.body.code).toBe('TASK_NOT_FOUND');

      const assigned = await api(other.token)
        .addAssignee(task.id, { accountId: other.account.id })
        .expect(404);
      expect(assigned.body.code).toBe('TASK_NOT_FOUND');
      const unassigned = await api(other.token)
        .removeAssignee(task.id, t.member.account.id)
        .expect(404);
      expect(unassigned.body.code).toBe('TASK_NOT_FOUND');
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(0);

      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(saved).toMatchObject({ title: 'Original', priority: 'LOW' });
    });
  });

  // ------------------------------------------------------- persistência
  describe('persistência', () => {
    it('a tarefa criada pela API é devolvida igual por GET, na lista e depois de reiniciar a aplicação', async () => {
      const t = await team();
      const created = await api(t.manager.token)
        .create(t.project.id, {
          title: '  Preparar apresentação  ',
          description: 'Diapositivos para a reunião.',
          priority: 'HIGH',
          assigneeIds: [t.member.account.id],
        })
        .expect(201);

      const got = await api(t.member.token).get(created.body.id).expect(200);
      expect(got.body).toEqual(created.body);
      expect(got.body).toMatchObject({
        title: 'Preparar apresentação',
        description: 'Diapositivos para a reunião.',
        status: 'TODO',
        priority: 'HIGH',
        assignees: [{ id: t.member.account.id }],
      });

      const list = await api(t.member.token).list(t.project.id).expect(200);
      expect(list.body.items).toEqual([created.body]);

      // Uma nova instância da aplicação lê a mesma tarefa da base de dados.
      const restarted = await createTestApp();
      try {
        const res = await request(restarted.getHttpServer())
          .get(`/tasks/${created.body.id}`)
          .set('Authorization', `Bearer ${t.member.token}`)
          .expect(200);
        expect(res.body).toEqual(created.body);
      } finally {
        await restarted.close();
      }
    });

    it('o responsável atribuído pela API fica guardado: GET, lista, base de dados e depois de reiniciar (US06, DE16)', async () => {
      const t = await team();
      const task = await createTask(app, t.project.id);
      const assigned = await api(t.manager.token)
        .addAssignee(task.id, { accountId: t.member.account.id })
        .expect(201);
      expect(assigned.body.assignees).toEqual([
        {
          id: t.member.account.id,
          name: 'Bruno Membro',
          status: 'ACTIVE',
          isProjectMember: true,
        },
      ]);

      const got = await api(t.member.token).get(task.id).expect(200);
      expect(got.body).toEqual(assigned.body);
      const list = await api(t.member.token).list(t.project.id).expect(200);
      expect(list.body.items).toEqual([assigned.body]);
      expect(
        await prisma.taskAssignee.findMany({
          where: { taskId: task.id },
          select: { accountId: true },
        }),
      ).toEqual([{ accountId: t.member.account.id }]);

      const restarted = await createTestApp();
      try {
        const res = await request(restarted.getHttpServer())
          .get(`/tasks/${task.id}`)
          .set('Authorization', `Bearer ${t.member.token}`)
          .expect(200);
        expect(res.body.assignees).toEqual(assigned.body.assignees);
      } finally {
        await restarted.close();
      }
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
          assigneeIds: [member.account.id],
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

    it('não atribui nem remove responsáveis', async () => {
      const { access, member, task, tasks } = await archivedAfterCheck();
      const taskAccess = { ...access, taskId: task.id };
      await expectArchived(tasks.addAssignee(taskAccess, member.account.id));
      await prisma.taskAssignee.create({
        data: { taskId: task.id, accountId: member.account.id },
      });
      await expectArchived(tasks.removeAssignee(taskAccess, member.account.id));
      expect(
        await prisma.taskAssignee.count({ where: { taskId: task.id } }),
      ).toBe(1);
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

  // ------------------------------------- lacunas do plano de testes
  describe('lacunas de docs/test-plan.md (T02, T04, T07, T08, T20, T23, T24)', () => {
    let t: Awaited<ReturnType<typeof team>>;

    beforeAll(async () => {
      t = await team();
    });

    it('T02: o Gestor cria a tarefa e consulta-a com o seu token; a base de dados tem os mesmos valores', async () => {
      const created = await api(t.manager.token)
        .create(t.project.id, {
          title: '  Rever textos  ',
          description: 'Rever os textos da página inicial.',
          priority: 'HIGH',
          assigneeIds: [t.member.account.id],
        })
        .expect(201);

      const got = await api(t.manager.token).get(created.body.id).expect(200);
      expect(got.body).toEqual(created.body);
      expect(got.body).toMatchObject({
        projectId: t.project.id,
        title: 'Rever textos',
        description: 'Rever os textos da página inicial.',
        status: 'TODO',
        priority: 'HIGH',
        assignees: [{ id: t.member.account.id, isProjectMember: true }],
      });

      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: created.body.id },
        include: { assignees: true },
      });
      expect(saved).toMatchObject({
        projectId: t.project.id,
        title: 'Rever textos',
        description: 'Rever os textos da página inicial.',
        status: 'TODO',
        priority: 'HIGH',
      });
      expect(saved.assignees.map((a) => a.accountId)).toEqual([
        t.member.account.id,
      ]);
    });

    it('T04: recusa um título vazio com 400 TITLE_INVALID e não cria nada', async () => {
      const before = await prisma.task.count({
        where: { projectId: t.project.id },
      });
      const res = await api(t.manager.token)
        .create(t.project.id, { title: '' })
        .expect(400);
      expect(res.body.code).toBe('TITLE_INVALID');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
      );
      expect(
        await prisma.task.count({ where: { projectId: t.project.id } }),
      ).toBe(before);
    });

    it('T07: ao editar, recusa um título com 151 caracteres e mantém o título guardado', async () => {
      const task = await createTask(app, t.project.id, { title: 'Original' });
      const res = await api(t.manager.token)
        .update(task.id, { title: 'a'.repeat(151) })
        .expect(400);
      expect(res.body.code).toBe('TITLE_INVALID');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
      );
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(saved.title).toBe('Original');
    });

    it.each([
      ['3 caracteres', 'abc', 'abc'],
      ['150 caracteres', 'a'.repeat(150), 'a'.repeat(150)],
      [
        '150 caracteres com espaços nas pontas',
        `  ${'a'.repeat(150)}  `,
        'a'.repeat(150),
      ],
      // H1: um emoji fora do BMP conta 1; o VARCHAR(150) também aceita os 150.
      [
        '150 emojis fora do BMP',
        '\u{1F600}'.repeat(150),
        '\u{1F600}'.repeat(150),
      ],
    ])('T08: aceita um título com %s', async (_, title, stored) => {
      const res = await api(t.manager.token)
        .create(t.project.id, { title })
        .expect(201);
      expect(res.body.title).toBe(stored);
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(saved.title).toBe(stored);
    });

    it('T20: um não-membro sem a permissão de Administrador não lista as tarefas: 404 PROJECT_NOT_FOUND', async () => {
      const outsider = await accountWithToken({ name: 'Carla de Fora' });
      const res = await api(outsider.token).list(t.project.id).expect(404);
      expect(res.body.code).toBe('PROJECT_NOT_FOUND');
    });

    it('T23: para um não-membro, o 400 de formato vem antes do 404 e o 404 antes do 400 das regras', async () => {
      const outsider = await accountWithToken({ name: 'Duarte de Fora' });
      const task = await createTask(app, t.project.id, { title: 'Original' });

      const format = await api(outsider.token)
        .create(t.project.id, { title: 'Tarefa', campoDesconhecido: 1 })
        .expect(400);
      expect(format.body.code).toBe('VALIDATION_ERROR');
      const formatOnUpdate = await api(outsider.token)
        .update(task.id, { campoDesconhecido: 1 })
        .expect(400);
      expect(formatOnUpdate.body.code).toBe('VALIDATION_ERROR');

      const rule = await api(outsider.token)
        .create(t.project.id, { title: '   ' })
        .expect(404);
      expect(rule.body.code).toBe('PROJECT_NOT_FOUND');
      const ruleOnUpdate = await api(outsider.token)
        .update(task.id, { title: '   ' })
        .expect(404);
      expect(ruleOnUpdate.body.code).toBe('TASK_NOT_FOUND');
    });

    it('T24: o Membro num projeto arquivado recebe 403 antes de 409, ao criar e ao editar', async () => {
      const archived = await team('ARCHIVED');
      const task = await createTask(app, archived.project.id, {
        title: 'Original',
      });

      const created = await api(archived.member.token)
        .create(archived.project.id, { title: 'Tarefa' })
        .expect(403);
      expect(created.body.code).toBe('NOT_PROJECT_MANAGER');
      const updated = await api(archived.member.token)
        .update(task.id, { title: 'Alterado' })
        .expect(403);
      expect(updated.body.code).toBe('NOT_PROJECT_MANAGER');
      expect(
        await prisma.task.count({ where: { projectId: archived.project.id } }),
      ).toBe(1);
      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(saved.title).toBe('Original');
    });
  });
});
