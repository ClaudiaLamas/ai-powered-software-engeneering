import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { TEST_PASSWORD, createAccount, createTestApp } from './fixtures.js';

describe('POST /auth/login (US01)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (body: object) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

  it('200 com credenciais certas: devolve o JWT e a conta', async () => {
    const ana = await createAccount(app, { name: 'Ana Teste' });

    const res = await login({ email: ana.email, password: TEST_PASSWORD }).expect(200);

    expect(res.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 3600,
      account: { id: ana.id, name: 'Ana Teste', email: ana.email, status: 'ACTIVE' },
    });
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.account).not.toHaveProperty('passwordHash');
  });

  it('401 INVALID_CREDENTIALS com a palavra-passe errada', async () => {
    const ana = await createAccount(app);
    const res = await login({ email: ana.email, password: `${TEST_PASSWORD}x` })
      .expect(401)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('401 INVALID_CREDENTIALS com uma conta pendente, igual a credenciais erradas', async () => {
    const pending = await createAccount(app, { status: 'PENDING' });
    const res = await login({ email: pending.email, password: TEST_PASSWORD }).expect(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('403 ACCOUNT_DEACTIVATED com uma conta desativada e a palavra-passe certa', async () => {
    const rui = await createAccount(app, { status: 'DEACTIVATED' });
    const res = await login({ email: rui.email, password: TEST_PASSWORD }).expect(403);
    expect(res.body).toMatchObject({ status: 403, code: 'ACCOUNT_DEACTIVATED' });
  });

  it('400 VALIDATION_ERROR com um campo desconhecido, com a mensagem em português', async () => {
    const res = await login({ email: 'a@exemplo.test', password: 'x', extra: 1 }).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors).toEqual([{ field: 'extra', message: 'Campo desconhecido.' }]);
  });

  it('400 VALIDATION_ERROR sem palavra-passe, com uma só mensagem por campo', async () => {
    const res = await login({ email: 'a@exemplo.test' }).expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors).toEqual([{ field: 'password', message: 'Indique a palavra-passe.' }]);
  });

  it('400 VALIDATION_ERROR sem email', async () => {
    const res = await login({ password: 'x' }).expect(400);
    expect(res.body.errors).toEqual([{ field: 'email', message: 'Indique um email válido.' }]);
  });

  it('400 VALIDATION_ERROR com JSON mal formado', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
