import { randomUUID } from 'node:crypto';
import { ProblemException } from '../common/problem.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthorizationService, ProjectAccess } from './authorization.service.js';

function serviceFor(found: { role: string; project: { status: string } } | null) {
  const findUnique = vi.fn().mockResolvedValue(found);
  const prisma = { projectMember: { findUnique } } as unknown as PrismaService;
  return { service: new AuthorizationService(prisma), findUnique };
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
      const { service, findUnique } = serviceFor({ role: 'MEMBER', project: { status: 'ACTIVE' } });

      await expect(service.requireMember(accountId, projectId)).resolves.toEqual({
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
      const error = await service.requireMember(accountId, projectId).catch((e: unknown) => e);
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
      expectProblem(() => service.requireManager(access('MEMBER')), 403, 'NOT_PROJECT_MANAGER');
    });
  });

  describe('requireWritable (PN09)', () => {
    it('aceita um projeto ativo', () => {
      const { service } = serviceFor(null);
      expect(() =>
        service.requireWritable({ projectId, role: 'MEMBER', projectStatus: 'ACTIVE' }),
      ).not.toThrow();
    });

    it('recusa um projeto arquivado com 409 PROJECT_ARCHIVED', () => {
      const { service } = serviceFor(null);
      expectProblem(
        () => service.requireWritable({ projectId, role: 'MANAGER', projectStatus: 'ARCHIVED' }),
        409,
        'PROJECT_ARCHIVED',
      );
    });
  });
});
