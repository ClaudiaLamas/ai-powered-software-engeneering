import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { FieldError, validationError } from './common/problem.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';

/** Mensagens do ValidationPipe do Nest, em português, pela regra. */
const NEST_MESSAGES: Record<string, string> = {
  whitelistValidation: 'Campo desconhecido.',
  isObject: 'O corpo do pedido tem de ser um objeto.',
};

function toFieldErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    // Com stopAtFirstError há no máximo uma mensagem por campo. As mensagens
    // de campo desconhecido e de corpo que não é objeto (por exemplo, `[]`)
    // vêm do Nest em inglês: são traduzidas aqui.
    const own = Object.entries(error.constraints ?? {}).map(([rule, message]) => ({
      field,
      message: NEST_MESSAGES[rule] ?? message,
    }));
    return [...own, ...toFieldErrors(error.children ?? [], field)];
  });
}

/**
 * Configuração partilhada pelo arranque (main.ts) e pelos testes de API:
 * validação dos pedidos e erros no formato Problem Details.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transform: true,
      exceptionFactory: (errors) => validationError(toFieldErrors(errors)),
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
}
