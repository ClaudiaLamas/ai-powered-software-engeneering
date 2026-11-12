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
const ASSIGNABLE = `GET /projects/${PROJECT_ID}/assignable-accounts`

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
      [`GET /projects/${PROJECT_ID}`]: () =>
        json(project({ progress: { todo: 25, inProgress: 0, done: 1, total: 26, percentDone: 4 } })),
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
    expect(wrapper.get('[data-test="progress-percent"]').text()).toBe('4% concluído')
    expect(wrapper.get('[data-test="progress-counts"]').text()).toBe(
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

  it('o filtro de estado mostra só esse grupo, e o progresso continua a contar todas as tarefas', async () => {
    const counts = { todo: 3, inProgress: 2, done: 1 }
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () =>
        json(project({ progress: { todo: 3, inProgress: 2, done: 1, total: 6, percentDone: 17 } })),
      [TASKS]: tasksByStatus({ IN_PROGRESS: page([task({ status: 'IN_PROGRESS' })], counts, { total: 2 }) }, counts),
    })
    const wrapper = await mountView()

    await wrapper.findAll('.filters select')[0]!.setValue('IN_PROGRESS')
    await flushPromises()

    expect(wrapper.findAll('.task-group')).toHaveLength(1)
    expect(group(wrapper, 'Em curso').get('h2').text()).toBe('Em curso (2)')
    expect(wrapper.get('[data-test="progress-counts"]').text()).toBe(
      'Por fazer: 3, Em curso: 2, Concluída: 1',
    )
  })

  it('ao mudar os filtros, ignora as respostas antigas dos grupos que ficaram escondidos', async () => {
    const all = { todo: 25, inProgress: 2, done: 1 }
    const high = { todo: 1, inProgress: 1, done: 0 }
    // O primeiro pedido de "Por fazer" (sem filtros) fica pendente até ao fim.
    let releaseTodo!: () => void
    const heldTodo = new Promise<Response>((resolve) => {
      releaseTodo = () => resolve(json(page(Array.from({ length: 20 }, () => task()), all, { total: 25 })))
    })
    let todoRequests = 0
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: (url) => {
        const status = url.searchParams.get('status')
        const counts = url.searchParams.get('priority') === 'HIGH' ? high : all
        if (status === 'TODO' && ++todoRequests === 1) return heldTodo
        if (status === 'IN_PROGRESS' && counts === high) {
          return json(page([task({ status: 'IN_PROGRESS', priority: 'HIGH' })], high))
        }
        return json(page([], counts))
      },
    })
    const wrapper = await mountView()

    await wrapper.findAll('.filters select')[0]!.setValue('IN_PROGRESS')
    await wrapper.findAll('.filters select')[1]!.setValue('HIGH')
    await flushPromises()
    releaseTodo()
    await flushPromises()

    expect(group(wrapper, 'Em curso').get('h2').text()).toBe('Em curso (1)')
    expect(group(wrapper, 'Em curso').text()).not.toContain('Ver mais')
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
      [`GET /projects/${PROJECT_ID}`]: () =>
        json(
          project({
            progress: created
              ? { todo: 1, inProgress: 0, done: 0, total: 1, percentDone: 0 }
              : { todo: 0, inProgress: 0, done: 0, total: 0, percentDone: null },
          }),
        ),
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
    expect(wrapper.get('[data-test="progress-percent"]').text()).toBe('Sem tarefas')

    const form = wrapper.get('form')
    await form.get('input').setValue('  Rever textos ')
    await form.get('select').setValue('HIGH')
    await form.trigger('submit')
    await flushPromises()

    expect(bodyOf(fetchMock, CREATE)).toEqual({ title: 'Rever textos', description: null, priority: 'HIGH' })
    expect(wrapper.text()).toContain('Tarefa "Rever textos" criada.')
    expect(group(wrapper, 'Por fazer').get('h2').text()).toBe('Por fazer (1)')
    expect(group(wrapper, 'Por fazer').text()).toContain('Rever textos')
    expect(wrapper.get('[data-test="progress-percent"]').text()).toBe('0% concluído')
    expect(wrapper.get('[data-test="progress-counts"]').text()).toBe(
      'Por fazer: 1, Em curso: 0, Concluída: 0',
    )
    expect((form.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('o Gestor cria uma tarefa com responsáveis escolhidos entre os membros ativos (DE16)', async () => {
    const newTask = task({ title: 'Rever textos' })
    const fetchMock = mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
      [ASSIGNABLE]: () =>
        json({
          items: [
            { id: ana.id, name: ana.name, status: 'ACTIVE' },
            { id: bruno.id, name: bruno.name, status: 'ACTIVE' },
          ],
        }),
      [CREATE]: () => json(newTask, 201),
    })
    const wrapper = await mountView()
    const form = wrapper.get('form')
    const boxes = form.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(2)
    await form.get('input').setValue('Rever textos')
    await boxes[0]!.setValue(true)
    await boxes[1]!.setValue(true)
    await form.trigger('submit')
    await flushPromises()

    expect(bodyOf(fetchMock, CREATE)).toEqual({
      title: 'Rever textos',
      description: null,
      priority: 'MEDIUM',
      assigneeIds: [ana.id, bruno.id],
    })
    // Depois de criar, nenhum responsável fica escolhido.
    expect(form.findAll('input[type="checkbox"]').every((b) => !(b.element as HTMLInputElement).checked)).toBe(true)
  })

  it('se não conseguir carregar quem pode ser responsável, avisa e deixa criar sem responsáveis', async () => {
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
      [ASSIGNABLE]: () => problem(500, 'INTERNAL', 'Erro.'),
    })
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Nova tarefa')
    expect(wrapper.find('form fieldset').exists()).toBe(false)
    expect(wrapper.findAll('[role="alert"]').map((a) => a.text())).toHaveLength(1)
  })

  it('o Membro não pede a lista de quem pode ser responsável', async () => {
    setSession('token-de-teste', bruno)
    const fetchMock = mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
    })
    await mountView()
    expect(calls(fetchMock)).not.toContain(ASSIGNABLE)
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

  it('ao mudar de projeto, ignora a resposta atrasada do projeto anterior', async () => {
    const OTHER_ID = '00000000-0000-4000-8000-0000000000b2'
    let releaseFirst!: () => void
    const heldFirst = new Promise<Response>((resolve) => {
      releaseFirst = () => resolve(json(project({ name: 'Site' })))
    })
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => heldFirst,
      [`GET /projects/${OTHER_ID}`]: () => json(project({ id: OTHER_ID, name: 'Loja' })),
      [TASKS]: () => json(page([], { todo: 0, inProgress: 0, done: 0 })),
      [`GET /projects/${OTHER_ID}/tasks`]: () => json(page([], { todo: 2, inProgress: 0, done: 0 })),
    })
    const wrapper = await mountView()

    await wrapper.vm.$router.push(`/projetos/${OTHER_ID}`)
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Loja')

    releaseFirst()
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Loja')
    expect(group(wrapper, 'Por fazer').get('h2').text()).toBe('Por fazer (2)')
  })

  it('ao mudar de projeto, não mostra as tarefas do anterior, mesmo que a lista falhe', async () => {
    const OTHER_ID = '00000000-0000-4000-8000-0000000000b2'
    const counts = { todo: 1, inProgress: 0, done: 0 }
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [`GET /projects/${OTHER_ID}`]: () => json(project({ id: OTHER_ID, name: 'Loja' })),
      [TASKS]: tasksByStatus({ TODO: page([task({ title: 'Tarefa do Site' })], counts) }, counts),
      [`GET /projects/${OTHER_ID}/tasks`]: () => json({ message: 'x' }, 500),
    })
    const wrapper = await mountView()
    expect(group(wrapper, 'Por fazer').text()).toContain('Tarefa do Site')

    await wrapper.vm.$router.push(`/projetos/${OTHER_ID}`)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Loja')
    expect(wrapper.text()).not.toContain('Tarefa do Site')
    expect(group(wrapper, 'Por fazer').get('[role="alert"]').text()).toContain(
      'Não foi possível contactar o servidor.',
    )
  })

  it('ao mudar os filtros, não mostra as tarefas dos filtros anteriores, mesmo que a lista falhe', async () => {
    const counts = { todo: 1, inProgress: 0, done: 0 }
    mockApi({
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [TASKS]: (url) => {
        if (url.searchParams.get('priority') === 'HIGH') return json({ message: 'x' }, 500)
        return tasksByStatus({ TODO: page([task({ title: 'Tarefa média' })], counts) }, counts)(url)
      },
    })
    const wrapper = await mountView()
    expect(group(wrapper, 'Por fazer').text()).toContain('Tarefa média')

    await wrapper.findAll('.filters select')[1]!.setValue('HIGH')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Tarefa média')
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
    await group(wrapper, 'Por fazer').get('.error-message button').trigger('click')
    await flushPromises()
    expect(group(wrapper, 'Por fazer').text()).toContain('Rever')
  })
})

describe('ProjectView: projeto, equipa e estado nos cartões (US07, US09, US10, US18)', () => {
  const PROJECT = `GET /projects/${PROJECT_ID}`
  const UPDATE = `PATCH /projects/${PROJECT_ID}`
  const ARCHIVE = `POST /projects/${PROJECT_ID}/archive`
  const noTasks = { todo: 0, inProgress: 0, done: 0 }

  beforeEach(() => {
    clearSession()
    setSession('token-de-teste', ana)
  })

  afterEach(() => vi.unstubAllGlobals())

  function button(wrapper: Awaited<ReturnType<typeof mountView>>, text: string) {
    const found = wrapper.findAll('button').find((b) => b.text() === text)
    if (!found) throw new Error(`Sem botão "${text}"`)
    return found
  }

  it('mostra o caminho, o estado do projeto e a equipa com a função e "conta desativada" (US18)', async () => {
    mockApi({
      [PROJECT]: () =>
        json(
          project({
            members: [
              { account: { id: ana.id, name: ana.name, status: 'ACTIVE' }, role: 'MANAGER', addedAt: ana.createdAt },
              { account: { id: bruno.id, name: 'Rui Costa', status: 'DEACTIVATED' }, role: 'MEMBER', addedAt: ana.createdAt },
            ],
          }),
        ),
      [TASKS]: () => json(page([], noTasks)),
      [ASSIGNABLE]: () => json({ items: [] }),
    })
    const wrapper = await mountView()

    const crumbs = wrapper.get('nav[aria-label="Caminho"]')
    expect(crumbs.get('a').text()).toBe('Painel')
    expect(crumbs.get('[aria-current="page"]').text()).toBe('Site')
    expect(wrapper.get('.title-row').text()).toContain('Ativo')
    expect(wrapper.get('summary').text()).toBe('Membros (2)')
    const members = wrapper.get('[aria-label="Membros do projeto"]').findAll('li').map((li) => li.text())
    expect(members).toEqual(['Ana GestoraGestor', 'Rui Costa (conta desativada)Membro'])
  })

  it('um Membro muda o estado no cartão: a tarefa muda de grupo e o progresso atualiza (US07, US09)', async () => {
    setSession('token-de-teste', bruno)
    const t = task({ title: 'Rever textos' })
    let moved = false
    const fetchMock = mockApi({
      [PROJECT]: () =>
        json(
          project({
            progress: moved
              ? { todo: 0, inProgress: 1, done: 0, total: 1, percentDone: 0 }
              : { todo: 1, inProgress: 0, done: 0, total: 1, percentDone: 0 },
          }),
        ),
      [TASKS]: (url) => {
        const counts = moved ? { todo: 0, inProgress: 1, done: 0 } : { todo: 1, inProgress: 0, done: 0 }
        const status = url.searchParams.get('status')
        const here = moved ? 'IN_PROGRESS' : 'TODO'
        return json(page(status === here ? [{ ...t, status: here }] : [], counts))
      },
      [`PUT /tasks/${t.id}/status`]: () => {
        moved = true
        return json({ ...t, status: 'IN_PROGRESS' })
      },
    })
    const wrapper = await mountView()

    const select = group(wrapper, 'Por fazer').get('select')
    expect(select.attributes('aria-label')).toBe('Estado de Rever textos')
    await select.setValue('IN_PROGRESS')
    await flushPromises()

    expect(bodyOf(fetchMock, `PUT /tasks/${t.id}/status`)).toEqual({ status: 'IN_PROGRESS' })
    expect(wrapper.text()).toContain('Estado de "Rever textos" alterado para "Em curso".')
    expect(group(wrapper, 'Por fazer').text()).not.toContain('Rever textos')
    expect(group(wrapper, 'Em curso').text()).toContain('Rever textos')
    expect(wrapper.get('[data-test="progress-counts"]').text()).toBe(
      'Por fazer: 0, Em curso: 1, Concluída: 0',
    )
  })

  it('se a mudança de estado falhar, o cartão volta ao estado real e aparece o erro', async () => {
    const t = task({ title: 'Rever textos' })
    mockApi({
      [PROJECT]: () => json(project()),
      [TASKS]: tasksByStatus({ TODO: page([t], { todo: 1, inProgress: 0, done: 0 }) }, { todo: 1, inProgress: 0, done: 0 }),
      [ASSIGNABLE]: () => json({ items: [] }),
      [`PUT /tasks/${t.id}/status`]: () => problem(409, 'PROJECT_ARCHIVED', 'Arquivado.'),
    })
    const wrapper = await mountView()

    await group(wrapper, 'Por fazer').get('select').setValue('DONE')
    await flushPromises()

    expect(wrapper.text()).toContain('O projeto está arquivado e não pode ser alterado.')
    expect((group(wrapper, 'Por fazer').get('select').element as HTMLSelectElement).value).toBe('TODO')
  })

  it('num projeto arquivado, os cartões não têm seletor de estado e o Gestor não pode editar nem arquivar', async () => {
    mockApi({
      [PROJECT]: () => json(project({ status: 'ARCHIVED' })),
      [TASKS]: tasksByStatus({ TODO: page([task()], { todo: 1, inProgress: 0, done: 0 }) }, { todo: 1, inProgress: 0, done: 0 }),
    })
    const wrapper = await mountView()

    expect(group(wrapper, 'Por fazer').find('select').exists()).toBe(false)
    expect(wrapper.get('.title-row').text()).toContain('Arquivado')
    expect(wrapper.text()).not.toContain('Editar projeto')
    expect(wrapper.text()).not.toContain('Arquivar projeto')
  })

  it('o Membro não pode editar nem arquivar o projeto (US10)', async () => {
    setSession('token-de-teste', bruno)
    mockApi({ [PROJECT]: () => json(project()), [TASKS]: () => json(page([], noTasks)) })
    const wrapper = await mountView()
    expect(wrapper.text()).not.toContain('Editar projeto')
    expect(wrapper.text()).not.toContain('Arquivar projeto')
  })

  it('o Gestor edita o nome e a descrição do projeto (US10)', async () => {
    const fetchMock = mockApi({
      [PROJECT]: () => json(project()),
      [TASKS]: () => json(page([], noTasks)),
      [ASSIGNABLE]: () => json({ items: [] }),
      [UPDATE]: () => json(project({ name: 'Site novo', description: null })),
    })
    const wrapper = await mountView()

    await button(wrapper, 'Editar projeto').trigger('click')
    const form = wrapper.get('form[aria-label="Editar projeto"]')
    await form.get('input').setValue('  Site novo ')
    await form.get('textarea').setValue('   ')
    await form.trigger('submit')
    await flushPromises()

    expect(bodyOf(fetchMock, UPDATE)).toEqual({ name: 'Site novo', description: null })
    expect(wrapper.get('h1').text()).toBe('Site novo')
    expect(wrapper.text()).toContain('Alterações ao projeto guardadas.')
    expect(wrapper.find('form[aria-label="Editar projeto"]').exists()).toBe(false)
  })

  it('o nome curto não é enviado e mostra o erro (PN12)', async () => {
    const fetchMock = mockApi({
      [PROJECT]: () => json(project()),
      [TASKS]: () => json(page([], noTasks)),
      [ASSIGNABLE]: () => json({ items: [] }),
    })
    const wrapper = await mountView()

    await button(wrapper, 'Editar projeto').trigger('click')
    const form = wrapper.get('form[aria-label="Editar projeto"]')
    await form.get('input').setValue('ab')
    await form.trigger('submit')
    await flushPromises()

    expect(form.get('.field-error').text()).toContain('O nome é obrigatório')
    expect(calls(fetchMock)).not.toContain(UPDATE)
  })

  it('o Gestor arquiva o projeto depois de confirmar e o projeto fica só de leitura (US10, CL3)', async () => {
    const fetchMock = mockApi({
      [PROJECT]: () => json(project()),
      [TASKS]: () => json(page([], noTasks)),
      [ASSIGNABLE]: () => json({ items: [] }),
      [ARCHIVE]: () => json(project({ status: 'ARCHIVED' })),
    })
    const wrapper = await mountView()

    await button(wrapper, 'Arquivar projeto').trigger('click')
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Arquivar o projeto "Site"?')
    expect(calls(fetchMock)).not.toContain(`POST /projects/${PROJECT_ID}/archive`)

    await button(wrapper, 'Sim, arquivar').trigger('click')
    await flushPromises()

    expect(calls(fetchMock)).toContain(`POST /projects/${PROJECT_ID}/archive`)
    expect(wrapper.text()).toContain('O projeto foi arquivado e ficou só de leitura.')
    expect(wrapper.get('.title-row').text()).toContain('Arquivado')
    expect(wrapper.text()).not.toContain('Nova tarefa')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('cancelar a confirmação não arquiva o projeto', async () => {
    const fetchMock = mockApi({
      [PROJECT]: () => json(project()),
      [TASKS]: () => json(page([], noTasks)),
      [ASSIGNABLE]: () => json({ items: [] }),
    })
    const wrapper = await mountView()

    await button(wrapper, 'Arquivar projeto').trigger('click')
    await button(wrapper, 'Cancelar').trigger('click')

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(calls(fetchMock).some((c) => c.includes('/archive'))).toBe(false)
  })
})
