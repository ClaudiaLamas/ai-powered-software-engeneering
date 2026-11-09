import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { FieldError, validationError } from './common/problem.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';

function toFieldErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    // Com stopAtFirstError há no máximo uma mensagem por campo. A mensagem de
    // campo desconhecido vem do Nest em inglês: é traduzida aqui.
    const own = Object.entries(error.constraints ?? {}).map(([rule, message]) => ({
      field,
      message: rule === 'whitelistValidation' ? 'Campo desconhecido.' : message,
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
