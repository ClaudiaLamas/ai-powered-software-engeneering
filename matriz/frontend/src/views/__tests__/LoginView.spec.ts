import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { clearSession, getToken } from '../../auth/session'
import LoginView from '../LoginView.vue'

function problem(status: number, code: string, detail: string) {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Erro', status, code, detail }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<p>Início</p>' } },
      { path: '/entrar', name: 'login', component: LoginView },
    ],
  })
  await router.push(path)
  const wrapper = mount(LoginView, { global: { plugins: [router] } })
  return { wrapper, router }
}

async function submit(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  await wrapper.get('input[type="email"]').setValue('ana@exemplo.test')
  await wrapper.get('input[type="password"]').setValue('palavra-passe-de-teste')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('LoginView (US01)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    clearSession()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('mostra a mensagem de erro com credenciais erradas e não abre sessão', async () => {
    fetchMock.mockResolvedValue(problem(401, 'INVALID_CREDENTIALS', 'O email ou a palavra-passe estão errados.'))
    const { wrapper } = await mountAt('/entrar')

    await submit(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe('O email ou a palavra-passe estão errados.')
    expect(getToken()).toBeNull()
  })

  it('mostra que a conta está desativada', async () => {
    fetchMock.mockResolvedValue(problem(403, 'ACCOUNT_DEACTIVATED', 'Esta conta foi desativada.'))
    const { wrapper } = await mountAt('/entrar')
    await submit(wrapper)
    expect(wrapper.get('[role="alert"]').text()).toBe('Esta conta foi desativada.')
  })

  it.each([
    ['500 do backend (por exemplo, sem base de dados)', () =>
      new Response(JSON.stringify({ statusCode: 500, message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })],
    ['502 do proxy do Vite (backend parado)', () => new Response('', { status: 502 })],
    ['falha de rede', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('com %s, diz que não foi possível contactar o servidor', async (_, response) => {
    fetchMock.mockImplementation(response)
    const { wrapper } = await mountAt('/entrar')

    await submit(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Não foi possível contactar o servidor. Tente outra vez.',
    )
    expect(getToken()).toBeNull()
  })

  it('com credenciais certas, guarda a sessão e vai para o destino pedido', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'token-de-teste',
          tokenType: 'Bearer',
          expiresIn: 3600,
          account: {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Ana Teste',
            email: 'ana@exemplo.test',
            status: 'ACTIVE',
            isAdmin: false,
            isSystemAccount: false,
            createdAt: '2026-11-01T10:00:00.000Z',
          },
        }),
        { status: 200 },
      ),
    )
    const { wrapper, router } = await mountAt('/entrar?redirect=/')

    await submit(wrapper)

    expect(getToken()).toBe('token-de-teste')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('avisa que a sessão expirou quando chega por um 401', async () => {
    const { wrapper } = await mountAt('/entrar?motivo=expirou')
    expect(wrapper.get('[role="status"]').text()).toBe('A sessão expirou. Entre outra vez.')
  })
})
