import { apiFetch } from '@/api/http'
import type { Account, LoginResponse } from '@/api/types'
import { clearSession, getToken, session, setAccount, setSession } from './session'

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

/** A conta autenticada: a da sessão ou, depois de recarregar a página, `GET /me`. */
export function ensureAccount(): Promise<Account> {
  return session.account ? Promise.resolve(session.account) : loadMe()
}

/**
 * Sair (US15). O backend não revoga o token (D06): a sessão é apagada logo no
 * frontend, sem esperar pelo servidor. O servidor é avisado em segundo plano,
 * com o token que a sessão tinha; se falhar ou não responder, nada muda.
 */
export function logout(): Promise<void> {
  const token = getToken()
  clearSession()
  if (token) {
    void apiFetch<void>('/auth/logout', { method: 'POST', auth: false, token }).catch(() => {
      // Sem rede ou token já expirado: a sessão já foi apagada.
    })
  }
  return Promise.resolve()
}
