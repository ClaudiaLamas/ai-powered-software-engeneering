import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProblemException, validationError } from './problem.js';

/** `404 NOT_FOUND`: o endereço pedido não corresponde a nenhuma operação. */
function routeNotFound(): ProblemException {
  return new ProblemException(
    404,
    'NOT_FOUND',
    'Não encontrado',
    'O endereço pedido não existe.',
  );
}

/** `413 PAYLOAD_TOO_LARGE`: o corpo passa o limite do body-parser (100 kB por omissão). */
function payloadTooLarge(): ProblemException {
  return new ProblemException(
    413,
    'PAYLOAD_TOO_LARGE',
    'Pedido demasiado grande',
    'O pedido é demasiado grande.',
  );
}

/** `500 INTERNAL_ERROR`: erro inesperado; os detalhes ficam só no log. */
function internalError(): ProblemException {
  return new ProblemException(
    500,
    'INTERNAL_ERROR',
    'Erro interno',
    'Ocorreu um erro inesperado. Tente outra vez.',
  );
}

/**
 * Corpo maior do que o limite: o Nest converte o erro do body-parser
 * (PayloadTooLargeError, do pacote http-errors) numa HttpException com 413.
 */
function isPayloadTooLarge(exception: unknown): boolean {
  return exception instanceof HttpException && exception.getStatus() === 413;
}

/**
 * Converte os erros da API no formato Problem Details (RFC 9457), com o
 * `Content-Type: application/problem+json` do contrato:
 * - ProblemException: tal como está;
 * - BadRequestException do Nest (por exemplo, JSON mal formado): `400 VALIDATION_ERROR`;
 * - rota que não existe: `404 NOT_FOUND`;
 * - corpo maior do que o limite: `413 PAYLOAD_TOO_LARGE`;
 * - qualquer outro erro que não é HttpException: `500 INTERNAL_ERROR`, sem
 *   detalhes na resposta (ficam no log).
 * As outras HttpException mantêm o corpo que trazem, como o `503` de
 * `GET /health` (`{ status, database }`, openapi.yaml).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (
      exception instanceof HttpException &&
      !(exception instanceof BadRequestException) &&
      !(exception instanceof NotFoundException) &&
      !isPayloadTooLarge(exception)
    ) {
      const body = exception.getResponse();
      res.setHeader('Content-Type', 'application/json');
      res
        .status(exception.getStatus())
        .send(
          JSON.stringify(
            typeof body === 'string'
              ? { statusCode: exception.getStatus(), message: body }
              : body,
          ),
        );
      return;
    }

    const problem = this.toProblem(exception);
    for (const [name, value] of Object.entries(problem.options.headers ?? {})) {
      res.setHeader(name, value);
    }
    res.setHeader('Content-Type', 'application/problem+json');
    res.status(problem.status).send(JSON.stringify(problem.toProblem()));
  }

  private toProblem(exception: unknown): ProblemException {
    if (exception instanceof ProblemException) return exception;
    if (exception instanceof BadRequestException) return validationError();
    if (exception instanceof NotFoundException) return routeNotFound();
    if (isPayloadTooLarge(exception)) return payloadTooLarge();
    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
    );
    return internalError();
  }
}
