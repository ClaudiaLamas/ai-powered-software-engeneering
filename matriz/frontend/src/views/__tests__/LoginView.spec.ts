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
    expect(wrapper.get('[role="status"]').text()).toBe(
      'A sessão expirou. Inicia sessão novamente.',
    )
  })

  describe('validação no formulário', () => {
    it('com os campos vazios, mostra o erro em cada campo e não chama a API', async () => {
      const { wrapper } = await mountAt('/entrar')

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(fetchMock).not.toHaveBeenCalled()
      const errors = wrapper.findAll('.field-error').map((e) => e.text())
      expect(errors).toEqual(['Indique o email.', 'Indique a palavra-passe.'])
      expect(wrapper.get('input[type="email"]').attributes('aria-invalid')).toBe('true')
    })

    it('com um email mal escrito, explica o formato e não chama a API', async () => {
      const { wrapper } = await mountAt('/entrar')
      await wrapper.get('input[type="email"]').setValue('ana.exemplo.test')
      await wrapper.get('input[type="password"]').setValue('x')

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(fetchMock).not.toHaveBeenCalled()
      expect(wrapper.get('.field-error').text()).toBe(
        'Indique um email válido, por exemplo nome@empresa.pt.',
      )
    })

    it('o erro de um campo desaparece quando a pessoa o corrige', async () => {
      const { wrapper } = await mountAt('/entrar')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      await wrapper.get('input[type="email"]').setValue('ana@exemplo.test')

      expect(wrapper.findAll('.field-error').map((e) => e.text())).toEqual([
        'Indique a palavra-passe.',
      ])
    })
  })

  it('desativa o botão e mostra "A entrar…" enquanto o pedido está em curso', async () => {
    let respond: (r: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (respond = resolve)))
    const { wrapper } = await mountAt('/entrar')

    await submit(wrapper)

    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('A entrar…')

    respond(problem(401, 'INVALID_CREDENTIALS', 'O email ou a palavra-passe estão errados.'))
    await flushPromises()
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toBe('Entrar')
  })
})
