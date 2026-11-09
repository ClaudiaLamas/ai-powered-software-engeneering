import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, session, setSession } from '../../auth/session'
import HomeView from '../HomeView.vue'

const ana = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ana Teste',
  email: 'ana@exemplo.test',
  status: 'ACTIVE' as const,
  isAdmin: false,
  isSystemAccount: false,
  createdAt: '2026-11-01T10:00:00.000Z',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('HomeView: conta autenticada (GET /me)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    clearSession()
    setSession('token-de-teste', { ...ana, name: 'Nome antigo' })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('pede GET /me com o token e mostra o nome e o email', async () => {
    fetchMock.mockResolvedValue(json(ana))
    const wrapper = mount(HomeView)

    expect(wrapper.text()).toContain('A carregar a sua conta…')
    await flushPromises()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/me')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-de-teste')
    expect(wrapper.get('h1').text()).toBe('Olá, Ana Teste')
    expect(wrapper.text()).toContain('ana@exemplo.test')
    expect(wrapper.text()).not.toContain('Administrador')
    // A conta da sessão fica atualizada (o cabeçalho mostra o mesmo nome).
    expect(session.account?.name).toBe('Ana Teste')
  })

  it('indica a permissão de Administrador', async () => {
    fetchMock.mockResolvedValue(json({ ...ana, isAdmin: true }))
    const wrapper = mount(HomeView)
    await flushPromises()
    expect(wrapper.text()).toContain('Permissão de Administrador')
  })

  it('mostra um erro se não conseguir carregar a conta', async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 500, message: 'Internal server error' }, 500))
    const wrapper = mount(HomeView)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Não foi possível carregar a sua conta. Tente outra vez.',
    )
  })
})
