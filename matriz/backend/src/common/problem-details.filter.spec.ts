import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ProblemException } from './problem.js';
import { ProblemDetailsFilter } from './problem-details.filter.js';

function fakeHost() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('ProblemDetailsFilter', () => {
  const filter = new ProblemDetailsFilter();

  it('responde com Problem Details e o code de uma ProblemException', () => {
    const { host, res } = fakeHost();
    filter.catch(
      new ProblemException(401, 'INVALID_CREDENTIALS', 'Não autenticado', 'O email ou a palavra-passe estão errados.'),
      host,
    );
    expect(res.statusCode).toBe(401);
    expect(res.headers['content-type']).toBe('application/problem+json');
    expect(JSON.parse(res.body as string)).toEqual({
      type: 'about:blank',
      title: 'Não autenticado',
      status: 401,
      code: 'INVALID_CREDENTIALS',
      detail: 'O email ou a palavra-passe estão errados.',
    });
  });

  it('acrescenta os cabeçalhos pedidos pela exceção', () => {
    const { host, res } = fakeHost();
    filter.catch(
      new ProblemException(401, 'UNAUTHENTICATED', 'Não autenticado', 'É preciso entrar com a sua conta.', {
        headers: { 'WWW-Authenticate': 'Bearer' },
      }),
      host,
    );
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it('converte um BadRequestException (por exemplo, JSON mal formado) em 400 VALIDATION_ERROR', () => {
    const { host, res } = fakeHost();
    filter.catch(new BadRequestException('Unexpected token'), host);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string)).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      title: 'Dados inválidos',
    });
  });
});
