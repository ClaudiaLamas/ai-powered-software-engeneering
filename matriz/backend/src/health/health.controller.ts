import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Tempo máximo de espera pela resposta da base de dados ao `SELECT 1`. */
export const HEALTH_QUERY_TIMEOUT_MS = 3000;

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
}

/** GET /health: confirma que a API está a correr e que acede à base de dados. */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    // O limite de ligação do PrismaService não cobre uma ligação já aberta a
    // um servidor que deixou de responder: sem este limite, o pedido ficaria
    // pendente. A consulta presa continua a ocupar a ligação até o servidor
    // responder.
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `a base de dados não respondeu em ${HEALTH_QUERY_TIMEOUT_MS} ms`,
            ),
          ),
        HEALTH_QUERY_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return { status: 'ok', database: 'up' };
    } catch (error) {
      this.logger.warn(
        `Sem acesso à base de dados: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      } satisfies HealthStatus);
    } finally {
      clearTimeout(timer);
    }
  }
}
