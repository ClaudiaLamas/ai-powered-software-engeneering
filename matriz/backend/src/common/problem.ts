/** Um erro por campo, como em `Problem.errors` (openapi.yaml). */
export interface FieldError {
  field: string;
  message: string;
}

/** Corpo de um erro no formato Problem Details (RFC 9457), com `code` estável. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: FieldError[];
}

/**
 * Erro da API com `code` estável (openapi.yaml). O ProblemDetailsFilter
 * converte-o na resposta `application/problem+json`.
 */
export class ProblemException extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    readonly detail?: string,
    readonly options: { errors?: FieldError[]; headers?: Record<string, string> } = {},
  ) {
    super(detail ?? title);
    this.name = 'ProblemException';
  }

  toProblem(): Problem {
    return {
      type: 'about:blank',
      title: this.title,
      status: this.status,
      code: this.code,
      ...(this.detail !== undefined && { detail: this.detail }),
      ...(this.options.errors && { errors: this.options.errors }),
    };
  }
}

/** `400 VALIDATION_ERROR`: JSON mal formado, campo desconhecido ou de tipo errado. */
export function validationError(errors?: FieldError[]): ProblemException {
  return new ProblemException(
    400,
    'VALIDATION_ERROR',
    'Dados inválidos',
    'O pedido tem dados inválidos.',
    { errors },
  );
}

/** `401 UNAUTHENTICATED`: sem JWT, JWT inválido ou expirado, ou conta desativada (D06). */
export function unauthenticated(): ProblemException {
  return new ProblemException(
    401,
    'UNAUTHENTICATED',
    'Não autenticado',
    'É preciso entrar com a sua conta.',
    { headers: { 'WWW-Authenticate': 'Bearer' } },
  );
}
