import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { clearSession, getToken, setSession } from '../../auth/session'
import AppHeader from '../AppHeader.vue'

describe('AppHeader: Sair (US15)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    clearSession()
    setSession('token-de-teste', {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Ana Teste',
      email: 'ana@exemplo.test',
      status: 'ACTIVE',
      isAdmin: false,
      isSystemAccount: false,
      createdAt: '2026-11-01T10:00:00.000Z',
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('mostra o nome e, ao sair, apaga a sessão e volta ao ecrã de entrada sem esperar pelo servidor', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<p />' } },
        { path: '/entrar', name: 'login', component: { template: '<p />' } },
      ],
    })
    await router.push('/')
    const wrapper = mount(AppHeader, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Ana Teste')
    expect(wrapper.get('a').text()).toBe('Matriz')
    expect(wrapper.get('a').attributes('href')).toBe('/')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(getToken()).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
  })
})
