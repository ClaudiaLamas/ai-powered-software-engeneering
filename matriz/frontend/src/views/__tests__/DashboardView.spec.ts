import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { ProjectSummary } from '../../api/types'
import { clearSession, session, setSession } from '../../auth/session'
import { ana, calls, json, mockApi, problem } from '../../__tests__/api-fixtures'
import DashboardView from '../DashboardView.vue'

const SITE: ProjectSummary = {
  id: '00000000-0000-4000-8000-0000000000a1',
  name: 'Site',
  status: 'ACTIVE',
  myRole: 'MANAGER',
  progress: { todo: 1, inProgress: 0, done: 3, total: 4, percentDone: 75 },
}
const CAMPANHA: ProjectSummary = {
  id: '00000000-0000-4000-8000-0000000000a2',
  name: 'Campanha',
  status: 'ACTIVE',
  myRole: 'MEMBER',
  progress: { todo: 0, inProgress: 0, done: 0, total: 0, percentDone: null },
}
const INTRANET: ProjectSummary = {
  id: '00000000-0000-4000-8000-0000000000a3',
  name: 'Intranet',
  status: 'ARCHIVED',
  myRole: 'MEMBER',
  progress: { todo: 2, inProgress: 1, done: 2, total: 5, percentDone: 40 },
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: DashboardView },
      { path: '/projetos/:projectId', name: 'project', component: { template: '<p />' } },
    ],
  })
  await router.push('/')
  const wrapper = mount(DashboardView, { global: { plugins: [router] } })
  return { wrapper, router }
}

function card(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], name: string) {
  const found = wrapper.findAll('[data-test="project-card"]').find((c) => c.find('a').text() === name)
  if (!found) throw new Error(`Cartão "${name}" não encontrado`)
  return found
}

describe('DashboardView: ecrã inicial (US05)', () => {
  beforeEach(() => {
    clearSession()
    setSession('token-de-teste', { ...ana, name: 'Nome antigo' })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('mostra o estado de carregamento e depois a conta autenticada (GET /me)', async () => {
    const fetchMock = mockApi({ 'GET /me': () => json(ana), 'GET /projects': () => json({ items: [] }) })
    const { wrapper } = await mountView()

    expect(wrapper.get('[role="status"]').text()).toBe('A carregar…')
    await flushPromises()

    expect(calls(fetchMock).sort()).toEqual(['GET /me', 'GET /projects'])
    const [, init] = fetchMock.mock.calls[0]!
    expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer token-de-teste')
    expect(wrapper.get('h1').text()).toBe('Olá, Ana Gestora')
    expect(wrapper.text()).toContain('ana@exemplo.test')
    expect(wrapper.text()).not.toContain('Administrador')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    // O cabeçalho mostra o nome atualizado.
    expect(session.account?.name).toBe('Ana Gestora')
  })

  it('indica a permissão de Administrador', async () => {
    mockApi({ 'GET /me': () => json({ ...ana, isAdmin: true }), 'GET /projects': () => json({ items: [] }) })
    const { wrapper } = await mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Permissão de Administrador')
  })

  it('lista os projetos com a função, a ligação para o detalhe e o progresso do servidor', async () => {
    mockApi({ 'GET /me': () => json(ana), 'GET /projects': () => json({ items: [SITE, CAMPANHA] }) })
    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.findAll('[data-test="project-card"]')).toHaveLength(2)
    const site = card(wrapper, 'Site')
    expect(site.get('a').attributes('href')).toBe(`/projetos/${SITE.id}`)
    expect(site.text()).toContain('Gestor')
    expect(site.get('[data-test="progress-percent"]').text()).toBe('75% concluído')
    expect(site.get('[data-test="progress-counts"]').text()).toBe('Por fazer: 1, Em curso: 0, Concluída: 3')
    expect(site.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('75')
    expect(site.get('[role="progressbar"] i').attributes('style')).toContain('width: 75%')
    expect(site.find('[data-test="archived"]').exists()).toBe(false)
    expect(card(wrapper, 'Campanha').text()).toContain('Membro')
  })

  it('mostra "Sem tarefas" sem percentagem nem contagens num projeto sem tarefas (PN13)', async () => {
    mockApi({ 'GET /me': () => json(ana), 'GET /projects': () => json({ items: [CAMPANHA] }) })
    const { wrapper } = await mountView()
    await flushPromises()

    const campanha = card(wrapper, 'Campanha')
    expect(campanha.get('[data-test="progress-percent"]').text()).toBe('Sem tarefas')
    expect(campanha.text()).not.toContain('%')
    expect(campanha.find('[data-test="progress-counts"]').exists()).toBe(false)
    expect(campanha.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('mostra um projeto arquivado com a indicação e o progresso (CL3)', async () => {
    mockApi({ 'GET /me': () => json(ana), 'GET /projects': () => json({ items: [INTRANET] }) })
    const { wrapper } = await mountView()
    await flushPromises()

    const intranet = card(wrapper, 'Intranet')
    expect(intranet.get('[data-test="archived"]').text()).toBe('Arquivado (só de leitura)')
    expect(intranet.get('[data-test="progress-percent"]').text()).toBe('40% concluído')
    expect(intranet.get('[data-test="progress-counts"]').text()).toBe('Por fazer: 2, Em curso: 1, Concluída: 2')
  })

  it('mostra a mensagem de lista vazia quando a conta não tem projetos', async () => {
    mockApi({ 'GET /me': () => json(ana), 'GET /projects': () => json({ items: [] }) })
    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Ainda não participa em nenhum projeto.')
    expect(wrapper.find('[data-test="project-card"]').exists()).toBe(false)
  })

  it('mostra um erro e volta a pedir com "Tentar outra vez"', async () => {
    let fail = true
    const fetchMock = mockApi({
      'GET /me': () => json(ana),
      'GET /projects': () =>
        fail ? json({ statusCode: 500, message: 'Internal server error' }, 500) : json({ items: [SITE] }),
    })
    const { wrapper } = await mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Não foi possível carregar os seus projetos. Tente outra vez.',
    )
    expect(wrapper.find('[data-test="project-card"]').exists()).toBe(false)

    fail = false
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(calls(fetchMock).filter((c) => c === 'GET /projects')).toHaveLength(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(card(wrapper, 'Site').exists()).toBe(true)
  })

  it('não mostra erro quando a sessão expira (401): o cliente HTTP volta ao ecrã de entrada', async () => {
    mockApi({
      'GET /me': () => problem(401, 'UNAUTHENTICATED', 'Sessão inválida.'),
      'GET /projects': () => problem(401, 'UNAUTHENTICATED', 'Sessão inválida.'),
    })
    const { wrapper } = await mountView()
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
