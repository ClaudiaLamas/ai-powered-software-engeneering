import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppBreadcrumbs from '../AppBreadcrumbs.vue'
import AppButton from '../AppButton.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import EmptyState from '../EmptyState.vue'
import ErrorMessage from '../ErrorMessage.vue'
import LoadingIndicator from '../LoadingIndicator.vue'
import ProgressIndicator from '../ProgressIndicator.vue'
import ProjectStatusBadge from '../ProjectStatusBadge.vue'

describe('AppButton', () => {
  it('mostra o aspeto pedido e, ocupado, fica desativado com o texto de espera', async () => {
    const wrapper = mount(AppButton, {
      props: { variant: 'danger', busy: false, busyLabel: 'A apagar…' },
      slots: { default: 'Apagar' },
    })
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.classes()).toContain('btn-danger')
    expect(wrapper.text()).toBe('Apagar')

    await wrapper.setProps({ busy: true })
    expect(wrapper.text()).toBe('A apagar…')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })
})

describe('ErrorMessage, EmptyState e LoadingIndicator', () => {
  it('o erro é anunciado e "Tentar outra vez" emite retry', async () => {
    const wrapper = mount(ErrorMessage, { props: { message: 'Falhou.', retryable: true } })
    expect(wrapper.get('[role="alert"]').text()).toBe('Falhou.')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('sem retryable, não há botão', () => {
    const wrapper = mount(ErrorMessage, { props: { message: 'Falhou.' } })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('o estado vazio e o carregamento mostram o texto; o carregamento é anunciado', () => {
    expect(mount(EmptyState, { props: { message: 'Nada.' } }).text()).toBe('Nada.')
    const loading = mount(LoadingIndicator)
    expect(loading.attributes('role')).toBe('status')
    expect(loading.text()).toBe('A carregar…')
  })
})

describe('ConfirmDialog', () => {
  it('mostra a pergunta e o erro, e emite confirm e cancel', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        question: 'Eliminar?',
        confirmLabel: 'Sim, eliminar',
        busyLabel: 'A eliminar…',
        busy: false,
        error: 'Não foi possível.',
      },
      attachTo: document.body,
    })
    const dialog = wrapper.get('[role="alertdialog"]')
    expect(document.getElementById(dialog.attributes('aria-labelledby')!)?.textContent).toBe('Eliminar?')
    expect(document.activeElement).toBe(dialog.element)
    expect(wrapper.get('[role="alert"]').text()).toBe('Não foi possível.')

    const [confirm, cancel] = wrapper.findAll('button')
    await confirm!.trigger('click')
    await cancel!.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('ProgressIndicator (US09, PN13)', () => {
  it('com tarefas, mostra a barra, a percentagem e as contagens', () => {
    const wrapper = mount(ProgressIndicator, {
      props: {
        projectName: 'Site',
        progress: { todo: 1, inProgress: 0, done: 3, total: 4, percentDone: 75 },
      },
    })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('75')
    expect(wrapper.get('[data-test="progress-percent"]').text()).toBe('75% concluído')
    expect(wrapper.get('[data-test="progress-counts"]').text()).toBe('Por fazer: 1, Em curso: 0, Concluída: 3')
  })

  it('sem tarefas, mostra só "Sem tarefas"', () => {
    const wrapper = mount(ProgressIndicator, {
      props: { projectName: 'Site', progress: { todo: 0, inProgress: 0, done: 0, total: 0, percentDone: null } },
    })
    expect(wrapper.text()).toBe('Sem tarefas')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })
})

describe('ProjectStatusBadge e AppBreadcrumbs', () => {
  it('mostra o estado do projeto em português', () => {
    expect(mount(ProjectStatusBadge, { props: { status: 'ACTIVE' } }).text()).toContain('Ativo')
    expect(mount(ProjectStatusBadge, { props: { status: 'ARCHIVED' } }).text()).toContain('Arquivado')
  })

  it('o caminho liga aos ecrãs anteriores e marca o atual', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<p />' } },
        { path: '/projetos/1', component: { template: '<p />' } },
      ],
    })
    await router.push('/projetos/1')
    const wrapper = mount(AppBreadcrumbs, {
      props: { items: [{ label: 'Painel', to: '/' }, { label: 'Site' }] },
      global: { plugins: [router] },
    })
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Caminho')
    expect(wrapper.get('a').text()).toBe('Painel')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('Site')
  })
})
