import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getToken, isAuthenticated, session, setSession } from '../session'

const account = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ana Teste',
  email: 'ana@exemplo.test',
  status: 'ACTIVE' as const,
  isAdmin: false,
  isSystemAccount: false,
  createdAt: '2026-11-01T10:00:00.000Z',
}

describe('sessão no frontend (D06, US15)', () => {
  beforeEach(() => {
    clearSession()
    sessionStorage.clear()
  })

  it('guarda o token em sessionStorage e a conta em memória', () => {
    setSession('token-de-teste', account)
    expect(getToken()).toBe('token-de-teste')
    expect(sessionStorage.getItem('matriz.accessToken')).toBe('token-de-teste')
    expect(session.account?.name).toBe('Ana Teste')
    expect(isAuthenticated()).toBe(true)
  })

  it('ao sair apaga o token e a conta', () => {
    setSession('token-de-teste', account)
    clearSession()
    expect(getToken()).toBeNull()
    expect(sessionStorage.getItem('matriz.accessToken')).toBeNull()
    expect(session.account).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })
})
