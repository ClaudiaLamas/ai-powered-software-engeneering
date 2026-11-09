import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/**
 * Abre uma rota a pedidos sem token. Por omissão, todas as rotas exigem sessão
 * (JwtAuthGuard global). Só `login`, `activate` e `health` são públicas.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);
