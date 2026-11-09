import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Conta do pedido, lida na base de dados em cada pedido (D06): a permissão de
 * Administrador é a atual, não a do momento em que o token foi emitido.
 */
export interface AuthenticatedAccount {
  id: string;
  isAdmin: boolean;
}

/** Injeta a conta autenticada num parâmetro do controlador. */
export const CurrentAccount = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedAccount =>
    context.switchToHttp().getRequest<{ user: AuthenticatedAccount }>().user,
);
