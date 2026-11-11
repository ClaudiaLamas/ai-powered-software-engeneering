import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { TaskPage, TaskStatus } from '../../api/types'
import { clearSession, setSession } from '../../auth/session'
import {
  PROJECT_ID,
  ana,
  bodyOf,
  bruno,
  calls,
  json,
  mockApi,
  page,
  problem,
  project,
  task,
} from '../../__tests__/api-fixtures'
import ProjectView from '../ProjectView.vue'

const TASKS = `GET /projects/${PROJECT_ID}/tasks`
const CREATE = `POST /projects/${PROJECT_ID}/tasks`

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projetos/:projectId', name: 'project', component: ProjectView },
      { path: '/tarefas/:taskId', name: 'task', component: { template: '<p />' } },
    ],
  })
  await router.push(`/projetos/${PROJECT_ID}`)
  const wrapper = mount(ProjectView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

/** Responde às listas por estado com `pages[status]`, de acordo com a query. */
function tasksByStatus(pages: Partial<Record<TaskStatus, TaskPage>>, counts: TaskPage['countsByStatus']) {
  return (url: URL) => {
    const status = url.searchParams.get('status') as TaskStatus
    return json(pages[status] ?? page([], counts))
  }
}

function group(wrapper: Awaited<ReturnType<typeof mountView>>, label: string) {
  return wrapper.get(`section[aria-label="${label}"]`)
}

describe('ProjectView (US08, US23, US06)', () => {
  beforeEach(() => {
    clearSession()
    setSession('token-de-teste', ana)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('mostra o projeto e os três grupos, com as contagens reais de countsByStatus', async () => {
    const counts = { todo: 25, inProgress: 0, done: 1 }
    const todo = Array.from({ length: 20 }, () => task())
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: tasksByStatus(
        {
          TODO: page(todo, counts, { total: 25 }),
          DONE: page([task({ status: 'DONE', title: 'Criar logótipo' })], counts),
        },
        counts,
      ),
    })

    const wrapper = await mountView()

    expect(wrapper.get('h1').text()).toBe('Site')
    expect(wrapper.text()).toContain('Novo site da empresa.')
    expect(wrapper.get('[aria-label="Tarefas por estado"]').text()).toBe(
      'Por fazer: 25, Em curso: 0, Concluída: 1',
    )
    expect(group(wrapper, 'Por fazer').get('h2').text()).toBe('Por fazer (25)')
    expect(group(wrapper, 'Por fazer').findAll('li')).toHaveLength(20)
    expect(group(wrapper, 'Em curso').text()).toContain('Sem tarefas neste estado')
    expect(group(wrapper, 'Concluída').text()).toContain('Criar logótipo')
    expect(group(wrapper, 'Concluída').text()).toContain('Sem responsável')
  })

  it('"Ver mais" junta a página seguinte sem perder as anteriores (US23)', async () => {
    const counts = { todo: 25, inProgress: 0, done: 0 }
    const first = Array.from({ length: 20 }, () => task())
    const rest = Array.from({ length: 5 }, () => task())
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: (url) => {
        if (url.searchParams.get('status') !== 'TODO') return json(page([], counts))
        return url.searchParams.get('page') === '2'
          ? json(page(rest, counts, { total: 25, page: 2 }))
          : json(page(first, counts, { total: 25 }))
      },
    })
    const wrapper = await mountView()

    await group(wrapper, 'Por fazer').get('button').trigger('click')
    await flushPromises()

    expect(group(wrapper, 'Por fazer').findAll('li')).toHaveLength(25)
    expect(group(wrapper, 'Por fazer').find('button').exists()).toBe(false)
  })

  it('o filtro de prioridade vai em cada pedido e os totais seguem countsByStatus', async () => {
    const all = { todo: 3, inProgress: 2, done: 1 }
    const high = { todo: 1, inProgress: 0, done: 1 }
    const fetchMock = mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: (url) => json(page([], url.searchParams.get('priority') === 'HIGH' ? high : all)),
    })
    const wrapper = await mountView()

    const priority = wrapper.findAll('.filters select')[1]!
    await priority.setValue('HIGH')
    await flushPromises()

    const listed = calls(fetchMock).filter((c) => c.includes('priority=HIGH'))
    expect(listed).toHaveLength(3)
    expect(listed.every((c) => c.includes('pageSize=20'))).toBe(true)
    expect(group(wrapper, 'Por fazer').get('h2').text()).toBe('Por fazer (1)')
    expect(group(wrapper, 'Em curso').get('h2').text()).toBe('Em curso (0)')
    expect(group(wrapper, 'Concluída').get('h2').text()).toBe('Concluída (1)')
  })

  it('o filtro de estado mostra só esse grupo, e as contagens continuam reais', async () => {
    const counts = { todo: 3, inProgress: 2, done: 1 }
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: tasksByStatus({ IN_PROGRESS: page([task({ status: 'IN_PROGRESS' })], counts, { total: 2 }) }, counts),
    })
    const wrapper = await mountView()

    await wrapper.findAll('.filters select')[0]!.setValue('IN_PROGRESS')
    await flushPromises()

    expect(wrapper.findAll('.task-group')).toHaveLength(1)
    expect(group(wrapper, 'Em curso').get('h2').text()).toBe('Em curso (2)')
    expect(wrapper.get('[aria-label="Tarefas por estado"]').text()).toBe(
      'Por fazer: 3, Em curso: 2, Concluída: 1',
    )
  })

  it('o Membro não vê o formulário de criação', async () => {
    setSession('token-de-teste', bruno)
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
    })
    const wrapper = await mountView()
    expect(wrapper.text()).not.toContain('Nova tarefa')
  })

  it('num projeto arquivado, o Gestor não vê o formulário e é avisado', async () => {
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project({ status: 'ARCHIVED' })),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
    })
    const wrapper = await mountView()
    expect(wrapper.text()).not.toContain('Nova tarefa')
    expect(wrapper.text()).toContain('Projeto arquivado')
  })

  it('o Gestor cria uma tarefa: a lista e as contagens atualizam sem recarregar', async () => {
    let created = false
    const newTask = task({ title: 'Rever textos', priority: 'HIGH' })
    const fetchMock = mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: (url) => {
        const counts = { todo: created ? 1 : 0, inProgress: 0, done: 0 }
        const items = created && url.searchParams.get('status') === 'TODO' ? [newTask] : []
        return json(page(items, counts))
      },
      [CREATE]: () => {
        created = true
        return json(newTask, 201)
      },
    })
    const wrapper = await mountView()
    expect(group(wrapper, 'Por fazer').get('h2').text()).toBe('Por fazer (0)')

    const form = wrapper.get('form')
    await form.get('input').setValue('  Rever textos ')
    await form.get('select').setValue('HIGH')
    await form.trigger('submit')
    await flushPromises()

    expect(bodyOf(fetchMock, CREATE)).toEqual({ title: 'Rever textos', description: null, priority: 'HIGH' })
    expect(wrapper.text()).toContain('Tarefa "Rever textos" criada.')
    expect(group(wrapper, 'Por fazer').get('h2').text()).toBe('Por fazer (1)')
    expect(group(wrapper, 'Por fazer').text()).toContain('Rever textos')
    expect((form.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('com o título vazio, não chama a API', async () => {
    const fetchMock = mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
    })
    const wrapper = await mountView()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(calls(fetchMock).some((c) => c.startsWith('POST'))).toBe(false)
    expect(wrapper.get('form .field-error').text()).toContain('O título é obrigatório')
  })

  it('se a criação falhar, mantém o que foi escrito e mostra o erro da API', async () => {
    let respond: (r: Response) => void = () => {}
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
      [CREATE]: () => new Promise<Response>((resolve) => (respond = resolve)),
    })
    const wrapper = await mountView()
    const form = wrapper.get('form')
    await form.get('input').setValue('Rever textos')
    await form.trigger('submit')
    await flushPromises()

    expect(form.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(form.get('button[type="submit"]').text()).toBe('A criar…')

    respond(problem(409, 'PROJECT_ARCHIVED', 'O projeto está arquivado.'))
    await flushPromises()

    expect(form.get('[role="alert"]').text()).toBe('O projeto está arquivado e não pode ser alterado.')
    expect((form.get('input').element as HTMLInputElement).value).toBe('Rever textos')
    expect(form.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('mostra o carregamento e depois o erro de um projeto a que não tem acesso', async () => {
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => problem(404, 'PROJECT_NOT_FOUND', 'O projeto não existe.'),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/projetos/:projectId', name: 'project', component: ProjectView }],
    })
    await router.push(`/projetos/${PROJECT_ID}`)
    const wrapper = mount(ProjectView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('A carregar o projeto…')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('O projeto não existe ou não tem acesso a ele.')
  })

  it('um grupo que falha mostra o erro e pode tentar outra vez', async () => {
    let fail = true
    const counts = { todo: 1, inProgress: 0, done: 0 }
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: (url) => {
        if (url.searchParams.get('status') === 'TODO' && fail) return json({ message: 'x' }, 500)
        return json(page(url.searchParams.get('status') === 'TODO' ? [task({ title: 'Rever' })] : [], counts))
      },
    })
    const wrapper = await mountView()
    expect(group(wrapper, 'Por fazer').get('[role="alert"]').text()).toContain(
      'Não foi possível contactar o servidor.',
    )

    fail = false
    await group(wrapper, 'Por fazer').get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(group(wrapper, 'Por fazer').text()).toContain('Rever')
  })
})
