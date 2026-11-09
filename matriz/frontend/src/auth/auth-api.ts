import { apiFetch } from '@/api/http'
import type { Account, LoginResponse } from '@/api/types'
import { clearSession, setAccount, setSession } from './session'

/** Entrar (US01): guarda o token e a conta. */
export async function login(email: string, password: string): Promise<Account> {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  setSession(res.accessToken, res.account)
  return res.account
}

/** Carrega a conta autenticada (`GET /me`), por exemplo depois de recarregar a página. */
export async function loadMe(): Promise<Account> {
  const account = await apiFetch<Account>('/me')
  setAccount(account)
  return account
}

/**
 * Sair (US15). O backend não revoga o token (D06): a sessão é apagada no
 * frontend mesmo que o pedido falhe.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' })
  } catch {
    // Sem rede ou token já expirado: sai na mesma.
  } finally {
    clearSession()
  }
}
