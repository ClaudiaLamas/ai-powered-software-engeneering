import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  HEALTH_QUERY_TIMEOUT_MS,
  HealthController,
} from './health.controller.js';

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

  describe('com uma ligação aberta a um servidor que não responde', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('responde 503 ao fim do tempo limite', async () => {
      prisma.$queryRaw.mockReturnValue(new Promise(() => {}));

      const result = controller.check().catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(HEALTH_QUERY_TIMEOUT_MS - 1);
      expect(vi.getTimerCount()).toBe(1); // ainda à espera

      await vi.advanceTimersByTimeAsync(1);
      const error = await result;

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toEqual({
        status: 'error',
        database: 'down',
      });
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it('não deixa temporizadores pendentes quando a base de dados responde', async () => {
    vi.useFakeTimers();
    try {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      await controller.check();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
