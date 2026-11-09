import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, setSession } from '../../auth/session'
import { authGuard, safeRedirect } from '../guard'

const account = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ana Teste',
  email: 'ana@exemplo.test',
  status: 'ACTIVE' as const,
  isAdmin: false,
  isSystemAccount: false,
  createdAt: '2026-11-01T10:00:00.000Z',
}

const route = (fullPath: string, isPublic = false) =>
  ({ fullPath, meta: { public: isPublic } }) as Parameters<typeof authGuard>[0]

describe('guarda de rotas (US15)', () => {
  beforeEach(() => clearSession())

  it('sem token, manda para o ecrã de entrada e guarda o destino', () => {
    expect(authGuard(route('/projetos/123'))).toEqual({
      name: 'login',
      query: { redirect: '/projetos/123' },
    })
  })

  it('com token, deixa passar', () => {
    setSession('token-de-teste', account)
    expect(authGuard(route('/projetos/123'))).toBe(true)
  })

  it('o ecrã de entrada é público; com sessão aberta, volta ao ecrã inicial', () => {
    expect(authGuard({ ...route('/entrar', true), name: 'login' } as never)).toBe(true)
    setSession('token-de-teste', account)
    expect(authGuard({ ...route('/entrar', true), name: 'login' } as never)).toEqual({ name: 'home' })
  })

  it('só aceita destinos internos depois de entrar', () => {
    expect(safeRedirect('/projetos/123')).toBe('/projetos/123')
    expect(safeRedirect('//exemplo.test')).toBe('/')
    expect(safeRedirect('https://exemplo.test')).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
  })
})
