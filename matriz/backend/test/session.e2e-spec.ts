import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TEST_PASSWORD, createAccount, createTestApp } from './fixtures.js';

describe('Sessão: GET /me, POST /auth/logout e o JWT (D06, US15)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAs(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.body.accessToken as string;
  }

  function expectUnauthenticated(res: request.Response) {
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe('Bearer');
    expect(res.body).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  }

  describe('GET /me', () => {
    it('200 com o token do login: devolve a conta autenticada', async () => {
      const ana = await createAccount(app, { name: 'Ana Teste', isAdmin: true });
      const token = await loginAs(ana.email);

      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: ana.id, name: 'Ana Teste', isAdmin: true });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('401 UNAUTHENTICATED sem token', async () => {
      expectUnauthenticated(await request(app.getHttpServer()).get('/me'));
    });

    it('401 UNAUTHENTICATED com um token mal formado', async () => {
      expectUnauthenticated(
        await request(app.getHttpServer()).get('/me').set('Authorization', 'Bearer abc.def.ghi'),
      );
    });

    it('401 UNAUTHENTICATED com um token assinado com outro segredo', async () => {
      const ana = await createAccount(app);
      const forged = await new JwtService({ secret: randomUUID() }).signAsync({ sub: ana.id });
      expectUnauthenticated(
        await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${forged}`),
      );
    });

    it('401 UNAUTHENTICATED com um token expirado (mais de 1 hora)', async () => {
      const ana = await createAccount(app);
      const jwt = app.get(JwtService);
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 3600;
      const expired = await jwt.signAsync({ sub: ana.id, iat: twoHoursAgo, exp: twoHoursAgo + 3600 });

      expectUnauthenticated(
        await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${expired}`),
      );
    });

    it('401 UNAUTHENTICATED quando a conta é desativada depois do login, antes de o token expirar', async () => {
      const rui = await createAccount(app);
      const token = await loginAs(rui.email);
      await app.get(PrismaService).account.update({
        where: { id: rui.id },
        data: { status: 'DEACTIVATED' },
      });

      expectUnauthenticated(
        await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`),
      );
    });
  });

  describe('POST /auth/logout (US15)', () => {
    it('204 com sessão; o backend não revoga o token (D06)', async () => {
      const ana = await createAccount(app);
      const token = await loginAs(ana.email);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Sair apaga o token só no frontend: o mesmo token continua válido até expirar.
      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('401 UNAUTHENTICATED sem token', async () => {
      expectUnauthenticated(await request(app.getHttpServer()).post('/auth/logout'));
    });
  });

  it('GET /health continua público', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
