import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getToken, setSession } from '../../auth/session'
import { ApiError, apiFetch, setUnauthenticatedHandler } from '../http'

const account = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ana Teste',
  email: 'ana@exemplo.test',
  status: 'ACTIVE' as const,
  isAdmin: false,
  isSystemAccount: false,
  createdAt: '2026-11-01T10:00:00.000Z',
}

function problem(status: number, code: string, detail: string) {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Erro', status, code, detail }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

describe('cliente HTTP', () => {
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

  it('envia o token no cabeçalho Authorization: Bearer e usa o prefixo /api', async () => {
    setSession('token-de-teste', account)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await expect(apiFetch('/me')).resolves.toEqual({ ok: true })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/me')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-de-teste')
  })

  it('não envia Authorization num pedido público', async () => {
    setSession('token-de-teste', account)
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    await apiFetch('/auth/login', { method: 'POST', body: {}, auth: false })
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).has('Authorization')).toBe(false)
  })

  it('converte um erro Problem Details em ApiError com o code e o detail', async () => {
    fetchMock.mockResolvedValue(problem(403, 'NOT_ADMIN', 'Só um Administrador pode fazer esta ação.'))
    const error = await apiFetch('/accounts').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, code: 'NOT_ADMIN', detail: 'Só um Administrador pode fazer esta ação.' })
  })

  it('perante um 401 num pedido com sessão, apaga a sessão e avisa (token expirado)', async () => {
    const handler = vi.fn()
    setUnauthenticatedHandler(handler)
    setSession('token-expirado', account)
    fetchMock.mockResolvedValue(problem(401, 'UNAUTHENTICATED', 'É preciso entrar com a sua conta.'))

    await expect(apiFetch('/me')).rejects.toBeInstanceOf(ApiError)
    expect(getToken()).toBeNull()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('um 401 do login (credenciais erradas) não dispara o aviso de sessão expirada', async () => {
    const handler = vi.fn()
    setUnauthenticatedHandler(handler)
    fetchMock.mockResolvedValue(problem(401, 'INVALID_CREDENTIALS', 'O email ou a palavra-passe estão errados.'))

    await expect(
      apiFetch('/auth/login', { method: 'POST', body: {}, auth: false }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('devolve undefined numa resposta 204', async () => {
    setSession('token-de-teste', account)
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})
