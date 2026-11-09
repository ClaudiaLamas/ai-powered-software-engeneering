import { Param, ParseUUIDPipe } from '@nestjs/common';
import { validationError } from './problem.js';

/**
 * Identificador UUID num parâmetro do caminho (por exemplo, `:projectId`).
 * Um valor que não é UUID dá `400 VALIDATION_ERROR` antes de qualquer consulta
 * à base de dados ou verificação de acesso (openapi.yaml, ordem das verificações).
 */
export const IdParam = (name: string) =>
  Param(
    name,
    new ParseUUIDPipe({
      exceptionFactory: () =>
        validationError([
          { field: name, message: 'O identificador não é válido.' },
        ]),
    }),
  );
