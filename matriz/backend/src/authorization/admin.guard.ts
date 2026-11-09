import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ProblemException } from '../common/problem.js';
import type { AuthenticatedAccount } from './authenticated-account.js';

/** Só para contas com permissão de Administrador (FN02, PN02): `403 NOT_ADMIN`. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedAccount }>();
    if (!user?.isAdmin) {
      throw new ProblemException(
        403,
        'NOT_ADMIN',
        'Sem permissão',
        'Só um Administrador pode fazer esta ação.',
      );
    }
    return true;
  }
}
