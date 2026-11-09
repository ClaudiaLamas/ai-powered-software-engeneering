import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AuthorizationExampleModule } from './authorization-example.module.js';
import {
  TEST_PASSWORD,
  createAccount,
  createComment,
  createProject,
  createTask,
  createTestApp,
} from './fixtures.js';

/**
 * Matriz de autorização (RNF02, PN02, PN05, PN09, PN15) sobre as rotas de
 * exemplo de test/authorization-example.module.ts.
 */
describe('Autorização: acesso a projetos, tarefas e comentários', () => {
  let app: INestApplication<App>;
  const tokens: Record<'manager' | 'member' | 'admin' | 'outsider', string> = {
    manager: '',
    member: '',
    admin: '',
    outsider: '',
  };
  const ids = {} as {
    managerId: string;
    memberId: string;
    project: string;
    archived: string;
    task: string;
    archivedTask: string;
    managerComment: string;
    memberComment: string;
    archivedComment: string;
  };

  async function tokenFor(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    app = await createTestApp([AuthorizationExampleModule]);

    const manager = await createAccount(app, { name: 'Gestor Teste' });
    const member = await createAccount(app, { name: 'Membro Teste' });
    const admin = await createAccount(app, {
      name: 'Administrador Teste',
      isAdmin: true,
    });
    const outsider = await createAccount(app, { name: 'Outra Conta' });

    const members = [
      { accountId: manager.id, role: 'MANAGER' as const },
      { accountId: member.id, role: 'MEMBER' as const },
    ];
    const project = await createProject(app, members);
    const archived = await createProject(app, members, 'ARCHIVED');
    const task = await createTask(app, project.id);
    const archivedTask = await createTask(app, archived.id);

    Object.assign(ids, {
      managerId: manager.id,
      memberId: member.id,
      project: project.id,
      archived: archived.id,
      task: task.id,
      archivedTask: archivedTask.id,
      managerComment: (await createComment(app, task.id, manager.id)).id,
      memberComment: (await createComment(app, task.id, member.id)).id,
      archivedComment: (await createComment(app, archivedTask.id, member.id))
        .id,
    });

    tokens.manager = await tokenFor(manager.email);
    tokens.member = await tokenFor(member.email);
    tokens.admin = await tokenFor(admin.email);
    tokens.outsider = await tokenFor(outsider.email);
  });

  afterAll(async () => {
    await app.close();
  });

  type Who = keyof typeof tokens | 'anonymous';

  function call(
    who: Who,
    method: 'get' | 'patch' | 'put' | 'post' | 'delete',
    path: string,
    body?: object,
  ) {
    let req = request(app.getHttpServer())[method](path);
    if (who !== 'anonymous')
      req = req.set('Authorization', `Bearer ${tokens[who]}`);
    return body ? req.send(body) : req;
  }

  function expectProblem(res: request.Response, status: number, code: string) {
    expect(res.status).toBe(status);
    expect(res.body).toMatchObject({ status, code });
  }

  describe('sem sessão: 401 UNAUTHENTICATED em todas as operações', () => {
    type Case = [
      'get' | 'patch' | 'put' | 'post' | 'delete',
      string,
      () => string,
    ];
    it.each<Case>([
      ['get', 'projeto', () => `/exemplo/projects/${ids.project}`],
      ['patch', 'projeto', () => `/exemplo/projects/${ids.project}`],
      ['put', 'estado da tarefa', () => `/exemplo/tasks/${ids.task}/status`],
      ['post', 'comentário', () => `/exemplo/tasks/${ids.task}/comments`],
      ['delete', 'comentário', () => `/exemplo/comments/${ids.memberComment}`],
      ['get', 'administração', () => '/exemplo/admin'],
    ])('%s %s', async (method, _label, path) => {
      expectProblem(
        await call('anonymous', method, path()),
        401,
        'UNAUTHENTICATED',
      );
    });
  });

  describe('projeto: ver (qualquer membro)', () => {
    it.each(['manager', 'member'] as const)(
      '%s: 200 com a sua função',
      async (who) => {
        const res = await call(
          who,
          'get',
          `/exemplo/projects/${ids.project}`,
        ).expect(200);
        expect(res.body.role).toBe(who === 'manager' ? 'MANAGER' : 'MEMBER');
      },
    );

    it.each(['admin', 'outsider'] as const)(
      '%s que não é membro: 404 PROJECT_NOT_FOUND, igual a um projeto que não existe',
      async (who) => {
        const forbidden = await call(
          who,
          'get',
          `/exemplo/projects/${ids.project}`,
        );
        const missing = await call(
          who,
          'get',
          `/exemplo/projects/${randomUUID()}`,
        );
        expectProblem(forbidden, 404, 'PROJECT_NOT_FOUND');
        expect(forbidden.body).toEqual(missing.body);
      },
    );

    it('identificador que não é UUID: 400 VALIDATION_ERROR, antes de consultar o acesso', async () => {
      const res = await call('member', 'get', '/exemplo/projects/abc');
      expectProblem(res, 400, 'VALIDATION_ERROR');
      expect(res.body.errors).toEqual([
        { field: 'projectId', message: 'O identificador não é válido.' },
      ]);
    });
  });

  describe('projeto: editar (só o Gestor, projeto ativo)', () => {
    const body = { description: 'Nova descrição' };

    it('Gestor: 200', async () => {
      await call(
        'manager',
        'patch',
        `/exemplo/projects/${ids.project}`,
        body,
      ).expect(200);
    });

    it('Membro: 403 NOT_PROJECT_MANAGER', async () => {
      expectProblem(
        await call('member', 'patch', `/exemplo/projects/${ids.project}`, body),
        403,
        'NOT_PROJECT_MANAGER',
      );
    });

    it('Administrador que não é membro: 404 (não 403), para não revelar o projeto', async () => {
      expectProblem(
        await call('admin', 'patch', `/exemplo/projects/${ids.project}`, body),
        404,
        'PROJECT_NOT_FOUND',
      );
    });

    it('Gestor num projeto arquivado: 409 PROJECT_ARCHIVED', async () => {
      expectProblem(
        await call(
          'manager',
          'patch',
          `/exemplo/projects/${ids.archived}`,
          body,
        ),
        409,
        'PROJECT_ARCHIVED',
      );
    });

    it('Membro num projeto arquivado: 403 antes de 409', async () => {
      expectProblem(
        await call(
          'member',
          'patch',
          `/exemplo/projects/${ids.archived}`,
          body,
        ),
        403,
        'NOT_PROJECT_MANAGER',
      );
    });

    it('corpo mal formado de quem não é membro: 400 antes de 404 (ordem do contrato)', async () => {
      expectProblem(
        await call('outsider', 'patch', `/exemplo/projects/${ids.project}`, {
          description: 1,
        }),
        400,
        'VALIDATION_ERROR',
      );
    });
  });

  describe('tarefas e atribuições (acesso pelo projeto da tarefa)', () => {
    it.each(['manager', 'member'] as const)(
      'mudar o estado, %s: 200',
      async (who) => {
        const res = await call(
          who,
          'put',
          `/exemplo/tasks/${ids.task}/status`,
          { status: 'DONE' },
        ).expect(200);
        expect(res.body).toMatchObject({
          taskId: ids.task,
          projectId: ids.project,
        });
      },
    );

    it.each(['admin', 'outsider'] as const)(
      'mudar o estado, %s que não é membro: 404 TASK_NOT_FOUND',
      async (who) => {
        expectProblem(
          await call(who, 'put', `/exemplo/tasks/${ids.task}/status`, {
            status: 'DONE',
          }),
          404,
          'TASK_NOT_FOUND',
        );
      },
    );

    it('tarefa que não existe: 404 TASK_NOT_FOUND', async () => {
      expectProblem(
        await call('member', 'put', `/exemplo/tasks/${randomUUID()}/status`, {
          status: 'DONE',
        }),
        404,
        'TASK_NOT_FOUND',
      );
    });

    it('mudar o estado num projeto arquivado: 409', async () => {
      expectProblem(
        await call(
          'member',
          'put',
          `/exemplo/tasks/${ids.archivedTask}/status`,
          { status: 'DONE' },
        ),
        409,
        'PROJECT_ARCHIVED',
      );
    });

    it('editar a tarefa ou mudar o responsável: Gestor 200, Membro 403', async () => {
      await call('manager', 'patch', `/exemplo/tasks/${ids.task}`).expect(200);
      expectProblem(
        await call('member', 'patch', `/exemplo/tasks/${ids.task}`),
        403,
        'NOT_PROJECT_MANAGER',
      );
    });
  });

  describe('comentários', () => {
    it('comentar: o autor é a conta do token', async () => {
      const res = await call(
        'member',
        'post',
        `/exemplo/tasks/${ids.task}/comments`,
        { body: 'Olá' },
      ).expect(201);
      expect(res.body.authorId).toBe(ids.memberId);
    });

    it('authorId no corpo é recusado com 400: a identidade nunca vem do pedido', async () => {
      const res = await call(
        'member',
        'post',
        `/exemplo/tasks/${ids.task}/comments`,
        {
          body: 'Olá',
          authorId: ids.managerId,
        },
      );
      expectProblem(res, 400, 'VALIDATION_ERROR');
      expect(res.body.errors).toEqual([
        { field: 'authorId', message: 'Campo desconhecido.' },
      ]);
    });

    it('comentar, quem não é membro: 404 TASK_NOT_FOUND', async () => {
      expectProblem(
        await call('outsider', 'post', `/exemplo/tasks/${ids.task}/comments`, {
          body: 'Olá',
        }),
        404,
        'TASK_NOT_FOUND',
      );
    });

    it('apagar o comentário de outra pessoa, mesmo sendo Gestor: 403 NOT_COMMENT_AUTHOR', async () => {
      expectProblem(
        await call(
          'manager',
          'delete',
          `/exemplo/comments/${ids.memberComment}`,
        ),
        403,
        'NOT_COMMENT_AUTHOR',
      );
    });

    it('apagar um comentário, quem não é membro: 404 COMMENT_NOT_FOUND', async () => {
      expectProblem(
        await call('admin', 'delete', `/exemplo/comments/${ids.memberComment}`),
        404,
        'COMMENT_NOT_FOUND',
      );
    });

    it('apagar o próprio comentário num projeto arquivado: 409', async () => {
      expectProblem(
        await call(
          'member',
          'delete',
          `/exemplo/comments/${ids.archivedComment}`,
        ),
        409,
        'PROJECT_ARCHIVED',
      );
    });

    it('apagar o próprio comentário: 204', async () => {
      await call(
        'manager',
        'delete',
        `/exemplo/comments/${ids.managerComment}`,
      ).expect(204);
    });
  });

  describe('operações só para o Administrador', () => {
    it('Administrador: 200', async () => {
      await call('admin', 'get', '/exemplo/admin').expect(200);
    });

    it.each(['manager', 'member', 'outsider'] as const)(
      '%s sem a permissão: 403 NOT_ADMIN',
      async (who) => {
        expectProblem(
          await call(who, 'get', '/exemplo/admin'),
          403,
          'NOT_ADMIN',
        );
      },
    );
  });
});
