import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Task } from '../../api/types'
import { clearSession, setSession } from '../../auth/session'
import {
  PROJECT_ID,
  ana,
  bodyOf,
  bruno,
  calls,
  json,
  mockApi,
  problem,
  project,
  task,
} from '../../__tests__/api-fixtures'
import TaskDetailView from '../TaskDetailView.vue'

async function mountView(t: Task) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tarefas/:taskId', name: 'task', component: TaskDetailView },
      { path: '/projetos/:projectId', name: 'project', component: { template: '<p>Projeto</p>' } },
    ],
  })
  await router.push(`/tarefas/${t.id}`)
  const wrapper = mount(TaskDetailView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

function button(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], text: string) {
  const found = wrapper.findAll('button').find((b) => b.text() === text)
  if (!found) throw new Error(`Sem botão "${text}"`)
  return found
}

function statusSelect(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper.get('section[aria-label="Estado da tarefa"] select')
}

describe('TaskDetailView (US19, US06, US07, US22)', () => {
  let current: Task

  beforeEach(() => {
    clearSession()
    setSession('token-de-teste', ana)
    current = task({
      title: 'Rever textos',
      description: 'Na página inicial.',
      priority: 'MEDIUM',
      assignee: { id: bruno.id, name: 'Bruno Membro', status: 'ACTIVE', isProjectMember: true },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  function routes(extra: Parameters<typeof mockApi>[0] = {}, p = project()) {
    return mockApi({
      [`GET /tasks/${current.id}`]: () => json(current),
      [`GET /projects/${PROJECT_ID}`]: () => json(p),
      ...extra,
    })
  }

  it('mostra o título, a descrição, o responsável, o estado e a prioridade em português', async () => {
    routes()
    const { wrapper } = await mountView(current)
    expect(wrapper.get('h1').text()).toBe('Rever textos')
    expect(wrapper.text()).toContain('Na página inicial.')
    expect(wrapper.text()).toContain('Bruno Membro')
    expect(wrapper.get('.badge-status-todo').text()).toBe('Por fazer')
    expect(wrapper.get('.badge-priority-medium').text()).toBe('Prioridade Média')
    expect(wrapper.text()).toContain('Site')
  })

  it('mostra "Sem responsável"', async () => {
    current = { ...current, assignee: null }
    routes()
    const { wrapper } = await mountView(current)
    expect(wrapper.text()).toContain('Sem responsável')
  })

  it('o Gestor edita o título, a descrição e a prioridade', async () => {
    const fetchMock = routes({
      [`PATCH /tasks/${current.id}`]: (_, init) => {
        const body = JSON.parse(String(init.body))
        return json({ ...current, ...body })
      },
    })
    const { wrapper } = await mountView(current)

    await button(wrapper, 'Editar').trigger('click')
    const form = wrapper.get('form')
    await form.get('input').setValue('Rever textos da página inicial')
    await form.get('textarea').setValue('')
    await form.get('select').setValue('LOW')
    await form.trigger('submit')
    await flushPromises()

    expect(bodyOf(fetchMock, `PATCH /tasks/${current.id}`)).toEqual({
      title: 'Rever textos da página inicial',
      description: null,
      priority: 'LOW',
    })
    expect(wrapper.get('h1').text()).toBe('Rever textos da página inicial')
    expect(wrapper.get('.badge-priority-low').text()).toBe('Prioridade Baixa')
    expect(wrapper.text()).toContain('Sem descrição')
    expect(wrapper.text()).toContain('Bruno Membro')
    expect(wrapper.get('[role="status"]').text()).toBe('Alterações guardadas.')
  })

  it('se a edição falhar, o formulário mantém o que foi escrito e mostra o erro da API', async () => {
    routes({
      [`PATCH /tasks/${current.id}`]: () =>
        problem(400, 'TITLE_INVALID', 'O título é obrigatório e tem de ter entre 3 e 150 caracteres.', [
          { field: 'title', message: 'O título tem de ter entre 3 e 150 caracteres.' },
        ]),
    })
    const { wrapper } = await mountView(current)
    await button(wrapper, 'Editar').trigger('click')
    await wrapper.get('form input').setValue('Novo título')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('form .field-error').text()).toBe('O título tem de ter entre 3 e 150 caracteres.')
    expect((wrapper.get('form input').element as HTMLInputElement).value).toBe('Novo título')
  })

  it('qualquer membro muda o estado (US07)', async () => {
    setSession('token-de-teste', bruno)
    const fetchMock = routes({
      [`PUT /tasks/${current.id}/status`]: () => json({ ...current, status: 'IN_PROGRESS' }),
    })
    const { wrapper } = await mountView(current)
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain('Editar')

    await statusSelect(wrapper).setValue('IN_PROGRESS')
    await flushPromises()

    expect(bodyOf(fetchMock, `PUT /tasks/${current.id}/status`)).toEqual({ status: 'IN_PROGRESS' })
    expect(wrapper.get('.badge-status-in_progress').text()).toBe('Em curso')
    expect(wrapper.get('[role="status"]').text()).toBe('Estado alterado para "Em curso".')
  })

  it('desativa o estado durante o pedido e volta ao anterior se falhar', async () => {
    let respond: (r: Response) => void = () => {}
    routes({
      [`PUT /tasks/${current.id}/status`]: () => new Promise<Response>((resolve) => (respond = resolve)),
    })
    const { wrapper } = await mountView(current)

    await statusSelect(wrapper).setValue('DONE')
    await flushPromises()
    expect(statusSelect(wrapper).attributes('disabled')).toBeDefined()

    respond(problem(409, 'PROJECT_ARCHIVED', 'O projeto está arquivado.'))
    await flushPromises()

    expect((statusSelect(wrapper).element as HTMLSelectElement).value).toBe('TODO')
    expect(statusSelect(wrapper).attributes('disabled')).toBeUndefined()
    expect(wrapper.get('.field-error').text()).toBe('O projeto está arquivado e não pode ser alterado.')
    expect(wrapper.get('.badge-status-todo').text()).toBe('Por fazer')
  })

  it('o Gestor elimina a tarefa só depois de confirmar e volta ao projeto', async () => {
    const fetchMock = routes({ [`DELETE /tasks/${current.id}`]: () => new Response(null, { status: 204 }) })
    const { wrapper, router } = await mountView(current)

    await button(wrapper, 'Eliminar').trigger('click')
    expect(calls(fetchMock).some((c) => c.startsWith('DELETE'))).toBe(false)
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Eliminar a tarefa "Rever textos"?')

    await button(wrapper, 'Sim, eliminar').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain(`DELETE /tasks/${current.id}`)
    expect(router.currentRoute.value.name).toBe('project')
    expect(router.currentRoute.value.params.projectId).toBe(PROJECT_ID)
  })

  it('cancelar a eliminação não chama a API', async () => {
    const fetchMock = routes()
    const { wrapper } = await mountView(current)
    await button(wrapper, 'Eliminar').trigger('click')
    await button(wrapper, 'Cancelar').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(calls(fetchMock).some((c) => c.startsWith('DELETE'))).toBe(false)
  })

  it('se a eliminação falhar, a tarefa continua à vista com o erro', async () => {
    routes({ [`DELETE /tasks/${current.id}`]: () => problem(403, 'NOT_PROJECT_MANAGER', 'Só o Gestor.') })
    const { wrapper, router } = await mountView(current)
    await button(wrapper, 'Eliminar').trigger('click')
    await button(wrapper, 'Sim, eliminar').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('task')
    expect(wrapper.get('[role="alertdialog"] [role="alert"]').text()).toBe(
      'Só o Gestor do projeto pode fazer esta alteração.',
    )
    expect(wrapper.get('h1').text()).toBe('Rever textos')
  })

  it('num projeto arquivado é só de leitura (CL3)', async () => {
    routes({}, project({ status: 'ARCHIVED' }))
    const { wrapper } = await mountView(current)
    expect(wrapper.text()).toContain('Projeto arquivado')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(statusSelect(wrapper).attributes('disabled')).toBeDefined()
  })

  it('mostra o erro de uma tarefa a que não tem acesso', async () => {
    mockApi({ [`GET /tasks/${current.id}`]: () => problem(404, 'TASK_NOT_FOUND', 'A tarefa não existe.') })
    const { wrapper } = await mountView(current)
    expect(wrapper.get('[role="alert"]').text()).toBe('A tarefa não existe ou não tem acesso a ela.')
  })
})
