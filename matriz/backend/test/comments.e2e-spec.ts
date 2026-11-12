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
 * Comentários das tarefas: listar, criar, editar e apagar os próprios (US13,
 * US19, PN15, CL3, CL12; openapi.yaml, tag `comments`).
 */
describe('Comentários (API)', () => {
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
    name: string,
    isAdmin = false,
  ): Promise<Actor> {
    const account = await createAccount(app, { name, isAdmin });
    return { account, token: await login(account.email) };
  }

  function api(token?: string) {
    const server = app.getHttpServer();
    const auth = (r: request.Test) =>
      token ? r.set('Authorization', `Bearer ${token}`) : r;
    return {
      list: (taskId: string) =>
        auth(request(server).get(`/tasks/${taskId}/comments`)),
      create: (taskId: string, body: object) =>
        auth(request(server).post(`/tasks/${taskId}/comments`)).send(body),
      update: (commentId: string, body: object) =>
        auth(request(server).patch(`/comments/${commentId}`)).send(body),
      remove: (commentId: string) =>
        auth(request(server).delete(`/comments/${commentId}`)),
    };
  }

  /** Projeto com Gestor, Membro, um Administrador que não é membro e uma tarefa. */
  async function team(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
    const manager = await accountWithToken('Ana Gestora');
    const member = await accountWithToken('Bruno Membro');
    const outsiderAdmin = await accountWithToken('Administrador', true);
    const project = await createProject(
      app,
      [
        { accountId: manager.account.id, role: 'MANAGER' },
        { accountId: member.account.id, role: 'MEMBER' },
      ],
      status,
    );
    const task = await createTask(app, project.id, { title: 'Rever textos' });
    return { manager, member, outsiderAdmin, project, task };
  }

  function addComment(
    taskId: string,
    authorId: string,
    body = 'Comentário de teste',
    createdAt?: Date,
  ) {
    return prisma.comment.create({
      data: { taskId, authorId, body, ...(createdAt && { createdAt }) },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ------------------------------------------------------------- listar
  describe('GET /tasks/{taskId}/comments (listTaskComments, US19)', () => {
    it('devolve uma lista vazia quando a tarefa não tem comentários', async () => {
      const t = await team();
      const res = await api(t.member.token).list(t.task.id).expect(200);
      expect(res.body).toEqual({ items: [] });
    });

    it('lista do mais antigo para o mais recente, com o autor e a data', async () => {
      const t = await team();
      const newer = await addComment(
        t.task.id,
        t.member.account.id,
        'Segundo',
        new Date('2026-11-10T10:00:00.000Z'),
      );
      const older = await addComment(
        t.task.id,
        t.manager.account.id,
        'Primeiro',
        new Date('2026-11-09T09:30:00.000Z'),
      );

      const res = await api(t.member.token).list(t.task.id).expect(200);

      expect(res.body.items).toEqual([
        {
          id: older.id,
          taskId: t.task.id,
          author: {
            id: t.manager.account.id,
            name: 'Ana Gestora',
            status: 'ACTIVE',
          },
          body: 'Primeiro',
          createdAt: '2026-11-09T09:30:00.000Z',
          editedAt: null,
        },
        {
          id: newer.id,
          taskId: t.task.id,
          author: {
            id: t.member.account.id,
            name: 'Bruno Membro',
            status: 'ACTIVE',
          },
          body: 'Segundo',
          createdAt: '2026-11-10T10:00:00.000Z',
          editedAt: null,
        },
      ]);
    });

    it('desempata pelo id quando dois comentários têm a mesma data', async () => {
      const t = await team();
      const at = new Date('2026-11-10T12:00:00.000Z');
      const created = await Promise.all(
        [1, 2, 3].map((n) =>
          addComment(t.task.id, t.member.account.id, `C${n}`, at),
        ),
      );

      const res = await api(t.member.token).list(t.task.id).expect(200);

      const expected = created.map((c) => c.id).sort();
      expect(res.body.items.map((c: { id: string }) => c.id)).toEqual(expected);
    });

    it('só mostra os comentários da tarefa pedida', async () => {
      const t = await team();
      const other = await createTask(app, t.project.id);
      await addComment(other.id, t.member.account.id);
      const mine = await addComment(t.task.id, t.member.account.id);

      const res = await api(t.member.token).list(t.task.id).expect(200);
      expect(res.body.items.map((c: { id: string }) => c.id)).toEqual([
        mine.id,
      ]);
    });

    it('CL12: mantém os comentários de quem saiu do projeto ou tem a conta desativada', async () => {
      const t = await team();
      await addComment(t.task.id, t.member.account.id, 'Deixo isto feito.');
      await prisma.projectMember.delete({
        where: {
          projectId_accountId: {
            projectId: t.project.id,
            accountId: t.member.account.id,
          },
        },
      });
      await prisma.account.update({
        where: { id: t.member.account.id },
        data: { status: 'DEACTIVATED' },
      });

      const res = await api(t.manager.token).list(t.task.id).expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        body: 'Deixo isto feito.',
        author: { name: 'Bruno Membro', status: 'DEACTIVATED' },
      });
    });

    it('CL3: num projeto arquivado, os comentários continuam visíveis', async () => {
      const t = await team('ARCHIVED');
      await addComment(t.task.id, t.member.account.id);
      const res = await api(t.member.token).list(t.task.id).expect(200);
      expect(res.body.items).toHaveLength(1);
    });

    it('a quem não é membro (mesmo Administrador) responde 404 TASK_NOT_FOUND', async () => {
      const t = await team();
      await addComment(t.task.id, t.member.account.id);
      const res = await api(t.outsiderAdmin.token).list(t.task.id).expect(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });

    it('uma tarefa que não existe dá 404 TASK_NOT_FOUND', async () => {
      const t = await team();
      const res = await api(t.member.token).list(randomUUID()).expect(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });

    it('sem sessão dá 401 e um id inválido dá 400 VALIDATION_ERROR', async () => {
      const t = await team();
      await api().list(t.task.id).expect(401);
      const res = await api(t.member.token).list('nao-e-uuid').expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ------------------------------------------------------------- criar
  describe('POST /tasks/{taskId}/comments (createTaskComment, US13)', () => {
    let t: Awaited<ReturnType<typeof team>>;

    beforeAll(async () => {
      t = await team();
    });

    const countOf = (taskId: string) =>
      prisma.comment.count({ where: { taskId } });

    it('o Membro comenta: o autor é a conta do token, o texto fica aparado e a data vem do servidor', async () => {
      const before = Date.now();
      const res = await api(t.member.token)
        .create(t.task.id, { body: '  Está pronto para rever.  \n' })
        .expect(201);

      expect(res.headers.location).toBeUndefined();
      expect(res.body).toEqual({
        id: expect.any(String),
        taskId: t.task.id,
        author: {
          id: t.member.account.id,
          name: 'Bruno Membro',
          status: 'ACTIVE',
        },
        body: 'Está pronto para rever.',
        createdAt: expect.any(String),
        editedAt: null,
      });
      expect(Date.parse(res.body.createdAt)).toBeGreaterThanOrEqual(
        before - 1000,
      );
      const saved = await prisma.comment.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(saved).toMatchObject({
        authorId: t.member.account.id,
        body: 'Está pronto para rever.',
        editedAt: null,
      });
    });

    it('o Gestor também comenta', async () => {
      const res = await api(t.manager.token)
        .create(t.task.id, { body: 'Obrigada.' })
        .expect(201);
      expect(res.body.author.id).toBe(t.manager.account.id);
    });

    it('aceita 2000 caracteres (com espaços nas pontas)', async () => {
      const body = 'a'.repeat(2000);
      const res = await api(t.member.token)
        .create(t.task.id, { body: `  ${body}  ` })
        .expect(201);
      expect(res.body.body).toBe(body);
    });

    it.each([
      ['authorId', { body: 'Olá', authorId: randomUUID() }],
      ['createdAt', { body: 'Olá', createdAt: '2020-01-01T00:00:00.000Z' }],
      ['taskId', { body: 'Olá', taskId: randomUUID() }],
      ['editedAt', { body: 'Olá', editedAt: '2020-01-01T00:00:00.000Z' }],
    ])(
      'recusa %s no corpo com 400 VALIDATION_ERROR e não cria nada',
      async (field, body) => {
        const before = await countOf(t.task.id);
        const res = await api(t.member.token)
          .create(t.task.id, body)
          .expect(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.errors).toEqual([
          { field, message: 'Campo desconhecido.' },
        ]);
        expect(await countOf(t.task.id)).toBe(before);
      },
    );

    it.each([
      ['em falta', {}],
      ['vazio', { body: '' }],
      ['só com espaços', { body: '    ' }],
      ['só com quebras de linha', { body: '\n\n\t' }],
      ['com mais de 2000 caracteres', { body: 'a'.repeat(2001) }],
    ])('recusa um comentário %s com 400 BODY_INVALID', async (_, body) => {
      const before = await countOf(t.task.id);
      const res = await api(t.member.token).create(t.task.id, body).expect(400);
      expect(res.body.code).toBe('BODY_INVALID');
      expect(res.body.errors[0].field).toBe('body');
      expect(await countOf(t.task.id)).toBe(before);
    });

    it.each([
      ['null', { body: null }],
      ['um número', { body: 42 }],
    ])('recusa um texto %s com 400 VALIDATION_ERROR', async (_, body) => {
      const res = await api(t.member.token).create(t.task.id, body).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('a quem não é membro (mesmo Administrador) responde 404 TASK_NOT_FOUND', async () => {
      const before = await countOf(t.task.id);
      const res = await api(t.outsiderAdmin.token)
        .create(t.task.id, { body: 'Olá' })
        .expect(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
      expect(await countOf(t.task.id)).toBe(before);
    });

    it('CL3: num projeto arquivado responde 409 PROJECT_ARCHIVED, antes das regras do texto', async () => {
      const archived = await team('ARCHIVED');
      for (const body of [{ body: 'Olá' }, { body: '   ' }]) {
        const res = await api(archived.member.token)
          .create(archived.task.id, body)
          .expect(409);
        expect(res.body.code).toBe('PROJECT_ARCHIVED');
      }
      expect(await countOf(archived.task.id)).toBe(0);
    });
  });

  // ------------------------------------------------------------- editar
  describe('PATCH /comments/{commentId} (updateComment, US13, PN15)', () => {
    it('o autor edita: o texto fica aparado, editedAt é preenchido e createdAt não muda', async () => {
      const t = await team();
      const comment = await addComment(
        t.task.id,
        t.member.account.id,
        'Original',
        new Date('2026-11-09T09:00:00.000Z'),
      );

      const res = await api(t.member.token)
        .update(comment.id, { body: '  Alterado  ' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: comment.id,
        taskId: t.task.id,
        author: { id: t.member.account.id, name: 'Bruno Membro' },
        body: 'Alterado',
        createdAt: '2026-11-09T09:00:00.000Z',
        editedAt: expect.any(String),
      });
      const list = await api(t.member.token).list(t.task.id).expect(200);
      expect(list.body.items[0].body).toBe('Alterado');
    });

    it('outra pessoa, mesmo o Gestor, recebe 403 NOT_COMMENT_AUTHOR e o comentário não muda', async () => {
      const t = await team();
      const comment = await addComment(
        t.task.id,
        t.member.account.id,
        'Original',
      );

      const res = await api(t.manager.token)
        .update(comment.id, { body: 'Mudado pelo Gestor' })
        .expect(403);

      expect(res.body.code).toBe('NOT_COMMENT_AUTHOR');
      const saved = await prisma.comment.findUniqueOrThrow({
        where: { id: comment.id },
      });
      expect(saved).toMatchObject({ body: 'Original', editedAt: null });
    });

    it('recusa authorId no corpo com 400 VALIDATION_ERROR', async () => {
      const t = await team();
      const comment = await addComment(
        t.task.id,
        t.member.account.id,
        'Original',
      );
      const res = await api(t.member.token)
        .update(comment.id, { body: 'Novo', authorId: t.manager.account.id })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const saved = await prisma.comment.findUniqueOrThrow({
        where: { id: comment.id },
      });
      expect(saved).toMatchObject({
        body: 'Original',
        authorId: t.member.account.id,
      });
    });

    it('recusa um texto só com espaços com 400 BODY_INVALID', async () => {
      const t = await team();
      const comment = await addComment(
        t.task.id,
        t.member.account.id,
        'Original',
      );
      const res = await api(t.member.token)
        .update(comment.id, { body: '   ' })
        .expect(400);
      expect(res.body.code).toBe('BODY_INVALID');
    });

    it('a quem não é membro responde 404 COMMENT_NOT_FOUND, também ao autor que saiu do projeto', async () => {
      const t = await team();
      const comment = await addComment(t.task.id, t.member.account.id);

      const outsider = await api(t.outsiderAdmin.token)
        .update(comment.id, { body: 'Olá' })
        .expect(404);
      expect(outsider.body.code).toBe('COMMENT_NOT_FOUND');

      await prisma.projectMember.delete({
        where: {
          projectId_accountId: {
            projectId: t.project.id,
            accountId: t.member.account.id,
          },
        },
      });
      const formerMember = await api(t.member.token)
        .update(comment.id, { body: 'Olá' })
        .expect(404);
      expect(formerMember.body.code).toBe('COMMENT_NOT_FOUND');
    });

    it('CL3: num projeto arquivado responde 409 PROJECT_ARCHIVED', async () => {
      const t = await team('ARCHIVED');
      const comment = await addComment(
        t.task.id,
        t.member.account.id,
        'Original',
      );
      const res = await api(t.member.token)
        .update(comment.id, { body: 'Novo' })
        .expect(409);
      expect(res.body.code).toBe('PROJECT_ARCHIVED');
    });
  });

  // --------------------------------------------------- outro utilizador
  /**
   * Uma conta ativa, sem a permissão de Administrador, que é Gestor de outro
   * projeto: não lista, não cria, não edita nem apaga comentários numa tarefa
   * de um projeto de que não é membro (PN02, DE02). Responde 404, sem revelar
   * se a tarefa ou o comentário existem.
   */
  describe('outro utilizador (Gestor de outro projeto, sem ser membro)', () => {
    let t: Awaited<ReturnType<typeof team>>;
    let other: Actor;

    beforeAll(async () => {
      t = await team();
      other = await accountWithToken('Carla Outro Projeto');
      await createProject(app, [
        { accountId: other.account.id, role: 'MANAGER' },
      ]);
    });

    it('não lista os comentários da tarefa: 404 TASK_NOT_FOUND', async () => {
      await addComment(t.task.id, t.member.account.id, 'Só para a equipa');
      const res = await api(other.token).list(t.task.id).expect(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
      expect(res.body).not.toHaveProperty('items');
    });

    it('não comenta na tarefa: 404 TASK_NOT_FOUND e nada é criado', async () => {
      const res = await api(other.token)
        .create(t.task.id, { body: 'Comentário intruso' })
        .expect(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
      expect(
        await prisma.comment.count({
          where: { authorId: other.account.id },
        }),
      ).toBe(0);
    });

    it('não edita nem apaga um comentário da tarefa: 404 COMMENT_NOT_FOUND e o comentário fica igual', async () => {
      const comment = await addComment(
        t.task.id,
        t.member.account.id,
        'Original',
      );

      const updated = await api(other.token)
        .update(comment.id, { body: 'Alterado' })
        .expect(404);
      expect(updated.body.code).toBe('COMMENT_NOT_FOUND');
      const removed = await api(other.token).remove(comment.id).expect(404);
      expect(removed.body.code).toBe('COMMENT_NOT_FOUND');

      const saved = await prisma.comment.findUniqueOrThrow({
        where: { id: comment.id },
      });
      expect(saved).toMatchObject({
        body: 'Original',
        authorId: t.member.account.id,
        editedAt: null,
      });
    });
  });

  // ------------------------------------------------------------- apagar
  describe('DELETE /comments/{commentId} (deleteComment, US13, PN15)', () => {
    it('o autor apaga: 204 e a tarefa deixa de o mostrar', async () => {
      const t = await team();
      const comment = await addComment(t.task.id, t.member.account.id);

      await api(t.member.token).remove(comment.id).expect(204);

      const list = await api(t.member.token).list(t.task.id).expect(200);
      expect(list.body.items).toEqual([]);
      await api(t.member.token).remove(comment.id).expect(404);
    });

    it('outra pessoa, mesmo o Gestor, recebe 403 NOT_COMMENT_AUTHOR e o comentário fica', async () => {
      const t = await team();
      const comment = await addComment(t.task.id, t.member.account.id);
      const res = await api(t.manager.token).remove(comment.id).expect(403);
      expect(res.body.code).toBe('NOT_COMMENT_AUTHOR');
      expect(await prisma.comment.count({ where: { id: comment.id } })).toBe(1);
    });

    it('a quem não é membro responde 404 COMMENT_NOT_FOUND', async () => {
      const t = await team();
      const comment = await addComment(t.task.id, t.member.account.id);
      const res = await api(t.outsiderAdmin.token)
        .remove(comment.id)
        .expect(404);
      expect(res.body.code).toBe('COMMENT_NOT_FOUND');
      expect(await prisma.comment.count({ where: { id: comment.id } })).toBe(1);
    });

    it('CL3: num projeto arquivado responde 409 PROJECT_ARCHIVED e o comentário fica', async () => {
      const t = await team('ARCHIVED');
      const comment = await addComment(t.task.id, t.member.account.id);
      const res = await api(t.member.token).remove(comment.id).expect(409);
      expect(res.body.code).toBe('PROJECT_ARCHIVED');
      expect(await prisma.comment.count({ where: { id: comment.id } })).toBe(1);
    });
  });
});
