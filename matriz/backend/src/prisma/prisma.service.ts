import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cliente Prisma partilhado pelos módulos (D04). A ligação vem de DATABASE_URL.
 * Não liga à base de dados no arranque: a primeira consulta abre a ligação,
 * para a API arrancar mesmo com a base de dados em baixo (GET /health responde 503).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // Limita só o tempo para abrir uma ligação ou obtê-la do pool; não
        // limita as consultas (GET /health tem o seu próprio limite).
        connectionTimeoutMillis: 5000,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
