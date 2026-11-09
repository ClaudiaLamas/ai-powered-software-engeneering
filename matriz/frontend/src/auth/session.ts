import { reactive } from 'vue'
import type { Account } from '@/api/types'

const TOKEN_KEY = 'matriz.accessToken'

// O token fica em sessionStorage: sobrevive a recarregar a página e desaparece
// ao fechar o separador (plano de implementação §1.2). A conta fica só em memória.
function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const session = reactive<{ token: string | null; account: Account | null }>({
  token: readToken(),
  account: null,
})

export function getToken(): string | null {
  return session.token
}

export function isAuthenticated(): boolean {
  return session.token !== null
}

export function setSession(token: string, account: Account): void {
  session.token = token
  session.account = account
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Sem sessionStorage (por exemplo, navegação privada): a sessão dura até recarregar.
  }
}

export function setAccount(account: Account): void {
  session.account = account
}

/** Sair (US15) ou sessão expirada: o token é apagado só no frontend (D06). */
export function clearSession(): void {
  session.token = null
  session.account = null
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada a apagar.
  }
}
