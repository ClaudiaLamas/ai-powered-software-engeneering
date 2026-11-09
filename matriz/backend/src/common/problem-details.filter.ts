import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProblemException, validationError } from './problem.js';

/**
 * Converte os erros da API no formato Problem Details (RFC 9457), com o
 * `Content-Type: application/problem+json` do contrato. Um BadRequestException
 * do Nest (por exemplo, JSON mal formado) passa a `400 VALIDATION_ERROR`.
 * Os restantes erros seguem o tratamento por omissão do Nest.
 */
@Catch(ProblemException, BadRequestException)
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: ProblemException | BadRequestException, host: ArgumentsHost): void {
    const problem =
      exception instanceof ProblemException ? exception : validationError();
    const res = host.switchToHttp().getResponse<Response>();
    for (const [name, value] of Object.entries(problem.options.headers ?? {})) {
      res.setHeader(name, value);
    }
    res.setHeader('Content-Type', 'application/problem+json');
    res.status(problem.status).send(JSON.stringify(problem.toProblem()));
  }
}
