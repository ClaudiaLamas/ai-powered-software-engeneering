import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'
import { clearSession, setSession } from '../../auth/session'
import { authGuard } from '../guard'
import { routes } from '../index'

const account = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ana Teste',
  email: 'ana@exemplo.test',
  status: 'ACTIVE' as const,
  isAdmin: false,
  isSystemAccount: false,
  createdAt: '2026-11-01T10:00:00.000Z',
}

/** O router com as rotas reais da aplicação e a guarda, em memória. */
async function open(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.beforeEach((to) => authGuard(to))
  await router.push(path)
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('endereço desconhecido', () => {
  beforeEach(() => clearSession())

  it('com sessão, mostra "Página não encontrada" com uma ligação para o painel', async () => {
    setSession('token-de-teste', account)
    const { router, wrapper } = await open('/qualquer-coisa/outra')

    expect(router.currentRoute.value.name).toBe('not-found')
    expect(wrapper.find('h1').text()).toBe('Página não encontrada')
    const link = wrapper.find('a')
    expect(link.text()).toBe('Ir para o painel')
    expect(link.attributes('href')).toBe('/')
  })

  it('sem sessão, manda para o ecrã de entrada e guarda o destino', async () => {
    const { router } = await open('/qualquer-coisa')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/qualquer-coisa')
  })

  it('não substitui as rotas conhecidas', () => {
    const router = createRouter({ history: createMemoryHistory(), routes })

    expect(router.resolve('/').name).toBe('home')
    expect(router.resolve('/entrar').name).toBe('login')
    expect(router.resolve('/projetos/00000000-0000-4000-8000-0000000000a1').name).toBe('project')
    expect(router.resolve('/tarefas/00000000-0000-4000-8000-0000000000b1').name).toBe('task')
  })
})
