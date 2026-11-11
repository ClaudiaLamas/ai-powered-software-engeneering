import type {
  AuthorizationService,
  ProjectAccess,
} from '../authorization/authorization.service.js';
import type { Prisma, ProjectStatus } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Cliente Prisma dentro de uma transação interativa. */
export type Tx = Prisma.TransactionClient;

/**
 * Corre `write` numa transação com a linha do projeto bloqueada
 * (`FOR SHARE`) e só depois de confirmar que o projeto continua ativo.
 * Arquivar é um `UPDATE` dessa linha, por isso espera pelo fim da escrita,
 * ou a escrita espera pelo arquivo e vê-o: nunca se escreve num projeto
 * arquivado (PN09). O `409` vem antes dos `400` das regras, como no
 * controlador. Usado pelas tarefas e pelos comentários.
 */
export function writeInActiveProject<T>(
  prisma: PrismaService,
  authz: AuthorizationService,
  access: ProjectAccess,
  write: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const [project] = await tx.$queryRaw<{ status: ProjectStatus }[]>`
      SELECT status FROM project WHERE id = ${access.projectId}::uuid FOR SHARE`;
    // O projeto não é eliminado no MVP; sem linha, trata-se como só de leitura.
    authz.requireWritable({
      ...access,
      projectStatus: project?.status ?? 'ARCHIVED',
    });
    return write(tx);
  });
}
