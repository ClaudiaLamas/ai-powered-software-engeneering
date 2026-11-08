import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch (error) {
      this.logger.warn(
        `Sem acesso à base de dados: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      } satisfies HealthStatus);
    }
  }
}
