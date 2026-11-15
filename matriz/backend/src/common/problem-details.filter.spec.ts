import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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

  it('converte um NotFoundException (rota que não existe) em 404 NOT_FOUND', () => {
    const { host, res } = fakeHost();
    filter.catch(new NotFoundException('Cannot GET /x'), host);
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toBe('application/problem+json');
    expect(JSON.parse(res.body as string)).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('converte o erro do limite do corpo (413) em 413 PAYLOAD_TOO_LARGE', () => {
    const { host, res } = fakeHost();
    // O Nest converte o PayloadTooLargeError do body-parser numa HttpException.
    filter.catch(new HttpException('request entity too large', 413), host);
    expect(res.statusCode).toBe(413);
    expect(JSON.parse(res.body as string)).toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('converte um erro inesperado em 500 INTERNAL_ERROR, sem os detalhes do erro', () => {
    const { host, res } = fakeHost();
    // O erro fica no log do servidor, não na resposta.
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    filter.catch(new Error('falha interna com dados sensíveis'), host);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('falha interna com dados sensíveis'),
    );
    log.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.headers['content-type']).toBe('application/problem+json');
    const body = JSON.parse(res.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      type: 'about:blank',
      title: 'Erro interno',
      status: 500,
      code: 'INTERNAL_ERROR',
      detail: 'Ocorreu um erro inesperado. Tente outra vez.',
    });
  });

  it('mantém o corpo de outras HttpException (por exemplo, o 503 de GET /health)', () => {
    const { host, res } = fakeHost();
    filter.catch(
      new ServiceUnavailableException({ status: 'error', database: 'down' }),
      host,
    );
    expect(res.statusCode).toBe(503);
    expect(res.headers['content-type']).toBe('application/json');
    expect(JSON.parse(res.body as string)).toEqual({
      status: 'error',
      database: 'down',
    });
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
