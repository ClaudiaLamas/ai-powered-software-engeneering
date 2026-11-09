import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { isAuthenticated } from '@/auth/session'

declare module 'vue-router' {
  interface RouteMeta {
    /** Rota acessível sem sessão (só o ecrã de entrada). */
    public?: boolean
  }
}

/** Só aceita destinos internos, para não redirecionar para outro site. */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/'
}

/**
 * Sem token, todas as rotas mandam para o ecrã de entrada (US15: depois de
 * sair, voltar atrás ou abrir o endereço de um projeto leva ao ecrã de entrada).
 */
export function authGuard(
  to: Pick<RouteLocationNormalized, 'fullPath' | 'meta' | 'name'>,
): true | RouteLocationRaw {
  if (to.meta.public) {
    return to.name === 'login' && isAuthenticated() ? { name: 'home' } : true
  }
  if (!isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
}
