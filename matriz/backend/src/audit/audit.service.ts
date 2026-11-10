import { Injectable } from '@nestjs/common';
import type { AdminAction, Prisma } from '../generated/prisma/client.js';

/** Uma entrada do registo administrativo (PN18). Pelo menos um alvo. */
export type AuditEntry = {
  actorId: string;
  action: AdminAction;
} & (
  | { targetAccountId: string; targetProjectId?: string }
  | { targetAccountId?: string; targetProjectId: string }
);

/**
 * Módulo Registo administrativo (`audit`, architecture.md): só insere
 * entradas, nunca as altera nem apaga (PN18). Escreve na transação de quem
 * chama, para a ação e o registo ficarem juntos ou não ficarem.
 */
@Injectable()
export class AuditService {
  async record(
    tx: Prisma.TransactionClient,
    entries: AuditEntry[],
  ): Promise<void> {
    await tx.adminAuditLog.createMany({ data: entries });
  }
}
