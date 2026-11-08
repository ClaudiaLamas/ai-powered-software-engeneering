import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// Usa a base de dados de DATABASE_URL (backend/.env): precisa do PostgreSQL
// do docker-compose.yml a correr. Só lê; não altera dados.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: usam-se só as variáveis do ambiente.
}

describe('GET /health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 e confirma o acesso à base de dados', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });
});
