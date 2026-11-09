import { randomUUID } from 'node:crypto';
import { ProblemException } from '../common/problem.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  AuthorizationService,
  ProjectAccess,
} from './authorization.service.js';

function serviceFor(
  found: { role: string; project: { status: string } } | null,
  others: { task?: unknown; comment?: unknown } = {},
) {
  const findUnique = vi.fn().mockResolvedValue(found);
  const taskFindUnique = vi.fn().mockResolvedValue(others.task ?? null);
  const commentFindUnique = vi.fn().mockResolvedValue(others.comment ?? null);
  const prisma = {
    projectMember: { findUnique },
    task: { findUnique: taskFindUnique },
    comment: { findUnique: commentFindUnique },
  } as unknown as PrismaService;
  return {
    service: new AuthorizationService(prisma),
    findUnique,
    taskFindUnique,
    commentFindUnique,
  };
}

/** Projeto com a função da conta (lista vazia = não é membro), como o Prisma devolve. */
function projectWith(
  role: 'MANAGER' | 'MEMBER' | null,
  status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE',
) {
  return { status, members: role ? [{ role }] : [] };
}

function expectProblem(fn: () => unknown, status: number, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemException);
    expect(error).toMatchObject({ status, code });
    return;
  }
  throw new Error('Era esperado um erro.');
}

describe('AuthorizationService', () => {
  const accountId = randomUUID();
  const projectId = randomUUID();

  describe('requireMember (RNF02, PN02)', () => {
    it('devolve a função e o estado do projeto a um membro', async () => {
      const { service, findUnique } = serviceFor({
        role: 'MEMBER',
        project: { status: 'ACTIVE' },
      });

      await expect(
        service.requireMember(accountId, projectId),
      ).resolves.toEqual({
        projectId,
        role: 'MEMBER',
        projectStatus: 'ACTIVE',
      });
      expect(findUnique).toHaveBeenCalledWith({
        where: { projectId_accountId: { projectId, accountId } },
        select: { role: true, project: { select: { status: true } } },
      });
    });

    it('responde 404 PROJECT_NOT_FOUND a quem não é membro, como a um projeto que não existe', async () => {
      const { service } = serviceFor(null);
      const error = await service
        .requireMember(accountId, projectId)
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ status: 404, code: 'PROJECT_NOT_FOUND' });
    });
  });

  describe('requireManager (PN05, DE07)', () => {
    const access = (role: 'MANAGER' | 'MEMBER'): ProjectAccess => ({
      projectId,
      role,
      projectStatus: 'ACTIVE',
    });

    it('aceita o Gestor', () => {
      const { service } = serviceFor(null);
      expect(() => service.requireManager(access('MANAGER'))).not.toThrow();
    });

    it('recusa um Membro com 403 NOT_PROJECT_MANAGER', () => {
      const { service } = serviceFor(null);
      expectProblem(
        () => service.requireManager(access('MEMBER')),
        403,
        'NOT_PROJECT_MANAGER',
      );
    });
  });

  describe('requireWritable (PN09)', () => {
    it('aceita um projeto ativo', () => {
      const { service } = serviceFor(null);
      expect(() =>
        service.requireWritable({
          projectId,
          role: 'MEMBER',
          projectStatus: 'ACTIVE',
        }),
      ).not.toThrow();
    });

    it('recusa um projeto arquivado com 409 PROJECT_ARCHIVED', () => {
      const { service } = serviceFor(null);
      expectProblem(
        () =>
          service.requireWritable({
            projectId,
            role: 'MANAGER',
            projectStatus: 'ARCHIVED',
          }),
        409,
        'PROJECT_ARCHIVED',
      );
    });
  });

  describe('requireTask (RNF02, PN02): acesso a uma tarefa pelo seu projeto', () => {
    const taskId = randomUUID();

    it('devolve o acesso ao projeto da tarefa a um membro', async () => {
      const { service, taskFindUnique } = serviceFor(null, {
        task: { projectId, project: projectWith('MEMBER') },
      });

      await expect(service.requireTask(accountId, taskId)).resolves.toEqual({
        taskId,
        projectId,
        role: 'MEMBER',
        projectStatus: 'ACTIVE',
      });
      expect(taskFindUnique).toHaveBeenCalledWith({
        where: { id: taskId },
        select: {
          projectId: true,
          project: {
            select: {
              status: true,
              members: { where: { accountId }, select: { role: true } },
            },
          },
        },
      });
    });

    it.each([
      ['a tarefa não existe', null],
      [
        'a conta não é membro do projeto da tarefa',
        { projectId, project: projectWith(null) },
      ],
    ])('responde 404 TASK_NOT_FOUND quando %s', async (_, task) => {
      const { service } = serviceFor(null, { task });
      const error = await service
        .requireTask(accountId, taskId)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ProblemException);
      expect(error).toMatchObject({ status: 404, code: 'TASK_NOT_FOUND' });
    });
  });

  describe('requireComment (RNF02, PN02): acesso a um comentário pelo projeto da sua tarefa', () => {
    const commentId = randomUUID();
    const taskId = randomUUID();
    const authorId = randomUUID();

    it('devolve o acesso ao projeto e o autor do comentário a um membro', async () => {
      const { service, commentFindUnique } = serviceFor(null, {
        comment: {
          authorId,
          taskId,
          task: { projectId, project: projectWith('MANAGER', 'ARCHIVED') },
        },
      });

      await expect(
        service.requireComment(accountId, commentId),
      ).resolves.toEqual({
        commentId,
        authorId,
        taskId,
        projectId,
        role: 'MANAGER',
        projectStatus: 'ARCHIVED',
      });
      expect(commentFindUnique).toHaveBeenCalledWith({
        where: { id: commentId },
        select: {
          authorId: true,
          taskId: true,
          task: {
            select: {
              projectId: true,
              project: {
                select: {
                  status: true,
                  members: { where: { accountId }, select: { role: true } },
                },
              },
            },
          },
        },
      });
    });

    it.each([
      ['o comentário não existe', null],
      [
        'a conta não é membro do projeto',
        { authorId, taskId, task: { projectId, project: projectWith(null) } },
      ],
    ])('responde 404 COMMENT_NOT_FOUND quando %s', async (_, comment) => {
      const { service } = serviceFor(null, { comment });
      const error = await service
        .requireComment(accountId, commentId)
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ status: 404, code: 'COMMENT_NOT_FOUND' });
    });
  });

  describe('requireCommentAuthor (PN15)', () => {
    const comment = {
      commentId: randomUUID(),
      authorId: accountId,
      taskId: randomUUID(),
      projectId,
      role: 'MEMBER' as const,
      projectStatus: 'ACTIVE' as const,
    };

    it('aceita o autor', () => {
      const { service } = serviceFor(null);
      expect(() =>
        service.requireCommentAuthor(accountId, comment),
      ).not.toThrow();
    });

    it('recusa outra conta com 403 NOT_COMMENT_AUTHOR, mesmo que seja Gestor', () => {
      const { service } = serviceFor(null);
      expectProblem(
        () =>
          service.requireCommentAuthor(randomUUID(), {
            ...comment,
            role: 'MANAGER',
          }),
        403,
        'NOT_COMMENT_AUTHOR',
      );
    });
  });
});
