import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setUnauthenticatedHandler } from '../../api/http'
import { logout } from '../auth-api'
import { clearSession, getToken, setSession } from '../session'

const account = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ana Teste',
  email: 'ana@exemplo.test',
  status: 'ACTIVE' as const,
  isAdmin: false,
  isSystemAccount: false,
  createdAt: '2026-11-01T10:00:00.000Z',
}

describe('logout (US15, D06)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    clearSession()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setUnauthenticatedHandler(() => {})
  })

  it('apaga a sessão logo, mesmo que o servidor nunca responda', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    setSession('token-de-teste', account)

    await logout()

    expect(getToken()).toBeNull()
    expect(sessionStorage.getItem('matriz.accessToken')).toBeNull()
  })

  it('avisa o servidor com o token que tinha antes de o apagar', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    setSession('token-de-teste', account)

    await logout()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/auth/logout')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-de-teste')
  })

  it('um 401 na resposta do logout não mostra o aviso de sessão expirada', async () => {
    const handler = vi.fn()
    setUnauthenticatedHandler(handler)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ type: 'about:blank', title: 'x', status: 401, code: 'UNAUTHENTICATED' }), {
        status: 401,
      }),
    )
    setSession('token-expirado', account)

    await logout()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(handler).not.toHaveBeenCalled()
  })

  it('sem sessão, não faz nenhum pedido', async () => {
    await logout()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
