import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './fixtures.js';

// Erros fora das operações do contrato: também no formato Problem Details
// (openapi.yaml, decisão interna de 2026-11-15).
describe('Erros gerais da API (Problem Details)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uma rota que não existe dá 404 NOT_FOUND em application/problem+json', async () => {
    const res = await request(app.getHttpServer())
      .get('/nao-existe')
      .expect(404);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Não encontrado',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'O endereço pedido não existe.',
    });
  });

  it('um corpo maior do que o limite dá 413 PAYLOAD_TOO_LARGE em application/problem+json', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.pt', password: 'x'.repeat(200_000) }))
      .expect(413);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Pedido demasiado grande',
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      detail: 'O pedido é demasiado grande.',
    });
  });
});
