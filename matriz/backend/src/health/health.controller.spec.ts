import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const prisma = { $queryRaw: vi.fn() };
  let controller: HealthController;

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = module.get(HealthController);
  });

  it('responde ok quando a base de dados responde', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('responde 503 quando a base de dados não responde', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const error = await controller.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      status: 'error',
      database: 'down',
    });
  });
});
