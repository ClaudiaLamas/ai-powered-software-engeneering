import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Comment, Task } from '../../api/types'
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
import { formatDateTime } from '../../tasks/comment-validation'
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

const ASSIGNABLE = `GET /projects/${PROJECT_ID}/assignable-accounts`
const carla = { id: '00000000-0000-4000-8000-000000000003', name: 'Carla Membro', status: 'ACTIVE' as const }
const assignableAccounts = [
  { id: ana.id, name: ana.name, status: 'ACTIVE' as const },
  { id: bruno.id, name: bruno.name, status: 'ACTIVE' as const },
  carla,
]

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: '00000000-0000-4000-8000-0000000000c1',
    taskId: '',
    author: { id: bruno.id, name: bruno.name, status: 'ACTIVE' },
    body: 'Comecei pela página inicial.',
    createdAt: '2026-11-10T09:30:00.000Z',
    editedAt: null,
    ...overrides,
  }
}

function commentForm(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper.get('form[aria-label="Novo comentário"]')
}

function assigneeSelect(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
  return wrapper.get('form[aria-label="Atribuir responsável"] select')
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
      assignees: [{ id: bruno.id, name: 'Bruno Membro', status: 'ACTIVE', isProjectMember: true }],
    })
    comments = []
  })

  afterEach(() => vi.unstubAllGlobals())

  let comments: Comment[]

  function routes(extra: Parameters<typeof mockApi>[0] = {}, p = project()) {
    return mockApi({
      [`GET /tasks/${current.id}`]: () => json(current),
      [`GET /projects/${PROJECT_ID}`]: () => json(p),
      [ASSIGNABLE]: () => json({ items: assignableAccounts }),
      [`GET /tasks/${current.id}/comments`]: () => json({ items: comments }),
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

  it('mostra o caminho Painel › projeto › tarefa, com ligações para os ecrãs anteriores', async () => {
    routes()
    const { wrapper } = await mountView(current)
    const crumbs = wrapper.get('nav[aria-label="Caminho"]')
    const links = crumbs.findAll('a')
    expect(links.map((l) => l.text())).toEqual(['Painel', 'Site'])
    expect(links[0]!.attributes('href')).toBe('/')
    expect(links[1]!.attributes('href')).toBe(`/projetos/${PROJECT_ID}`)
    expect(crumbs.get('[aria-current="page"]').text()).toBe('Rever textos')
  })

  it('mostra "Sem responsável"', async () => {
    current = { ...current, assignees: [] }
    routes()
    const { wrapper } = await mountView(current)
    expect(wrapper.text()).toContain('Sem responsável')
  })

  it('mostra todos os responsáveis, cada um com a sua indicação (DE14, DE16)', async () => {
    current = {
      ...current,
      status: 'DONE',
      assignees: [
        { id: bruno.id, name: 'Bruno Membro', status: 'ACTIVE', isProjectMember: true },
        { id: carla.id, name: 'Rui Saiu', status: 'ACTIVE', isProjectMember: false },
      ],
    }
    routes()
    const { wrapper } = await mountView(current)
    const items = wrapper.findAll('.assignee-list li')
    expect(items.map((li) => li.text().replace(/\s*Remover$/, ''))).toEqual([
      'Bruno Membro',
      'Rui Saiu (já não é membro)',
    ])
  })

  it('o Gestor atribui um responsável escolhido entre quem ainda não é (US06, DE16)', async () => {
    const fetchMock = routes({
      [`POST /tasks/${current.id}/assignees`]: () =>
        json(
          {
            ...current,
            assignees: [...current.assignees, { ...carla, isProjectMember: true }],
          },
          201,
        ),
    })
    const { wrapper } = await mountView(current)
    const options = assigneeSelect(wrapper).findAll('option').map((o) => o.text())
    expect(options).toEqual(['Escolher…', 'Ana Gestora', 'Carla Membro'])
    const submit = wrapper.get('form[aria-label="Atribuir responsável"] button')
    expect(submit.attributes('disabled')).toBeDefined()

    await assigneeSelect(wrapper).setValue(carla.id)
    await wrapper.get('form[aria-label="Atribuir responsável"]').trigger('submit')
    await flushPromises()

    expect(bodyOf(fetchMock, `POST /tasks/${current.id}/assignees`)).toEqual({ accountId: carla.id })
    expect(wrapper.findAll('.assignee-list li')).toHaveLength(2)
    expect(wrapper.get('[role="status"]').text()).toBe('Carla Membro passou a responsável.')
    expect(assigneeSelect(wrapper).findAll('option').map((o) => o.text())).toEqual([
      'Escolher…',
      'Ana Gestora',
    ])
  })

  it('se a atribuição falhar, mostra o erro da API e os responsáveis não mudam', async () => {
    routes({
      [`POST /tasks/${current.id}/assignees`]: () =>
        problem(409, 'ASSIGNEE_ALREADY_ASSIGNED', 'Esta pessoa já é responsável pela tarefa.'),
    })
    const { wrapper } = await mountView(current)
    await assigneeSelect(wrapper).setValue(carla.id)
    await wrapper.get('form[aria-label="Atribuir responsável"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Esta pessoa já é responsável pela tarefa.')
    expect(wrapper.findAll('.assignee-list li')).toHaveLength(1)
  })

  it('o Gestor remove um responsável; sem nenhum, mostra "Sem responsável"', async () => {
    const fetchMock = routes({
      [`DELETE /tasks/${current.id}/assignees/${bruno.id}`]: () => new Response(null, { status: 204 }),
    })
    const { wrapper } = await mountView(current)
    await wrapper.get('button[aria-label="Remover Bruno Membro dos responsáveis"]').trigger('click')
    await flushPromises()
    expect(calls(fetchMock)).toContain(`DELETE /tasks/${current.id}/assignees/${bruno.id}`)
    expect(wrapper.text()).toContain('Sem responsável')
    expect(wrapper.get('[role="status"]').text()).toBe('Bruno Membro deixou de ser responsável.')
    expect(assigneeSelect(wrapper).findAll('option').map((o) => o.text())).toContain('Bruno Membro')
  })

  it('o Membro vê os responsáveis, mas não os pode mudar nem pede a lista de quem pode ser', async () => {
    setSession('token-de-teste', bruno)
    const fetchMock = routes()
    const { wrapper } = await mountView(current)
    expect(wrapper.text()).toContain('Bruno Membro')
    expect(wrapper.find('form[aria-label="Atribuir responsável"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label^="Remover"]').exists()).toBe(false)
    expect(calls(fetchMock)).not.toContain(ASSIGNABLE)
  })

  it('enquanto carrega quem pode ser responsável, di-lo em vez do formulário', async () => {
    routes({ [ASSIGNABLE]: () => new Promise<Response>(() => {}) })
    const { wrapper } = await mountView(current)
    expect(wrapper.text()).toContain('A carregar quem pode ser responsável…')
    expect(wrapper.find('form[aria-label="Atribuir responsável"]').exists()).toBe(false)
  })

  it('quando já não há ninguém para atribuir, di-lo em vez do formulário', async () => {
    routes({ [ASSIGNABLE]: () => json({ items: [assignableAccounts[1]] }) })
    const { wrapper } = await mountView(current)
    expect(wrapper.text()).toContain('Não há mais membros do projeto que possam ser responsáveis.')
    expect(wrapper.find('form[aria-label="Atribuir responsável"]').exists()).toBe(false)
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

  it('enquanto guarda a edição, não deixa mudar o estado', async () => {
    let respond: (r: Response) => void = () => {}
    const fetchMock = routes({
      [`PATCH /tasks/${current.id}`]: () => new Promise<Response>((resolve) => (respond = resolve)),
    })
    const { wrapper } = await mountView(current)
    await button(wrapper, 'Editar').trigger('click')
    await wrapper.get('form input').setValue('Rever textos da página inicial')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(statusSelect(wrapper).attributes('disabled')).toBeDefined()
    await statusSelect(wrapper).setValue('DONE')
    await flushPromises()
    expect(calls(fetchMock).some((c) => c.startsWith('PUT'))).toBe(false)

    respond(json({ ...current, title: 'Rever textos da página inicial' }))
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Rever textos da página inicial')
    expect(statusSelect(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('enquanto muda o estado, não deixa guardar a edição nem eliminar', async () => {
    let respond: (r: Response) => void = () => {}
    const fetchMock = routes({
      [`PUT /tasks/${current.id}/status`]: () => new Promise<Response>((resolve) => (respond = resolve)),
    })
    const { wrapper } = await mountView(current)
    await button(wrapper, 'Eliminar').trigger('click')
    expect(button(wrapper, 'Sim, eliminar').attributes('disabled')).toBeUndefined()

    await statusSelect(wrapper).setValue('DONE')
    await flushPromises()
    expect(button(wrapper, 'Sim, eliminar').attributes('disabled')).toBeDefined()
    await button(wrapper, 'Cancelar').trigger('click')
    await button(wrapper, 'Editar').trigger('click')
    expect(button(wrapper, 'Guardar').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(calls(fetchMock).some((c) => c.startsWith('PATCH') || c.startsWith('DELETE'))).toBe(false)

    respond(json({ ...current, status: 'DONE' }))
    await flushPromises()
    expect(button(wrapper, 'Guardar').attributes('disabled')).toBeUndefined()
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

  it('ao mudar de tarefa, ignora a resposta atrasada da tarefa anterior', async () => {
    const other = task({ title: 'Criar logótipo' })
    let releaseFirst!: () => void
    const heldFirst = new Promise<Response>((resolve) => {
      releaseFirst = () => resolve(json(current))
    })
    mockApi({
      [`GET /tasks/${current.id}`]: () => heldFirst,
      [`GET /tasks/${other.id}`]: () => json(other),
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
    })
    const { wrapper, router } = await mountView(current)

    await router.push(`/tarefas/${other.id}`)
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Criar logótipo')

    releaseFirst()
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Criar logótipo')
  })

  it('ao mudar de tarefa, ignora a resposta de uma mudança de estado da tarefa anterior', async () => {
    const other = task({ title: 'Criar logótipo' })
    let respond: (r: Response) => void = () => {}
    mockApi({
      [`GET /tasks/${current.id}`]: () => json(current),
      [`GET /tasks/${other.id}`]: () => json(other),
      [`GET /projects/${PROJECT_ID}`]: () => json(project()),
      [`PUT /tasks/${current.id}/status`]: () => new Promise<Response>((resolve) => (respond = resolve)),
    })
    const { wrapper, router } = await mountView(current)
    await statusSelect(wrapper).setValue('DONE')
    await flushPromises()

    await router.push(`/tarefas/${other.id}`)
    await flushPromises()
    respond(json({ ...current, status: 'DONE' }))
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Criar logótipo')
    expect(wrapper.get('.badge-status-todo').text()).toBe('Por fazer')
  })

  it('mostra o erro de uma tarefa a que não tem acesso', async () => {
    mockApi({ [`GET /tasks/${current.id}`]: () => problem(404, 'TASK_NOT_FOUND', 'A tarefa não existe.') })
    const { wrapper } = await mountView(current)
    expect(wrapper.get('[role="alert"]').text()).toBe('A tarefa não existe ou não tem acesso a ela.')
  })

  describe('comentários (US13, US19, PN15)', () => {
    function commentsSection(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
      return wrapper.get('section[aria-labelledby="comments-title"]')
    }

    it('lista os comentários pela ordem da API, com o autor e a data e a hora', async () => {
      comments = [
        comment(),
        comment({
          id: '00000000-0000-4000-8000-0000000000c2',
          author: { id: carla.id, name: 'Carla Saiu', status: 'DEACTIVATED' },
          body: 'Falta a página de contactos.',
          createdAt: '2026-11-10T14:05:00.000Z',
          editedAt: '2026-11-10T15:00:00.000Z',
        }),
      ]
      routes()
      const { wrapper } = await mountView(current)
      const items = commentsSection(wrapper).findAll('.comment-list li')
      expect(items).toHaveLength(2)
      expect(items[0]!.get('strong').text()).toBe('Bruno Membro')
      expect(items[0]!.get('time').text()).toBe(formatDateTime('2026-11-10T09:30:00.000Z'))
      expect(items[0]!.get('time').attributes('datetime')).toBe('2026-11-10T09:30:00.000Z')
      expect(items[0]!.get('.comment-body').text()).toBe('Comecei pela página inicial.')
      expect(items[1]!.get('strong').text()).toBe('Carla Saiu (conta desativada)')
      expect(items[1]!.text()).toContain('(editado)')
    })

    it('sem comentários, di-lo', async () => {
      routes()
      const { wrapper } = await mountView(current)
      expect(commentsSection(wrapper).text()).toContain('Ainda não há comentários.')
    })

    it('enquanto carregam, di-lo e ainda não mostra o formulário', async () => {
      routes({ [`GET /tasks/${current.id}/comments`]: () => new Promise<Response>(() => {}) })
      const { wrapper } = await mountView(current)
      expect(commentsSection(wrapper).get('[role="status"]').text()).toBe('A carregar os comentários…')
      expect(wrapper.find('form[aria-label="Novo comentário"]').exists()).toBe(false)
    })

    it('se não carregarem, mostra o erro e o resto da tarefa', async () => {
      routes({ [`GET /tasks/${current.id}/comments`]: () => problem(500, 'INTERNAL_ERROR', 'Erro.') })
      const { wrapper } = await mountView(current)
      expect(commentsSection(wrapper).get('[role="alert"]').text()).toBe(
        'Não foi possível contactar o servidor. Tente outra vez.',
      )
      expect(wrapper.get('h1').text()).toBe('Rever textos')
    })

    it('um Membro comenta: o comentário aparece no fim da lista e o campo esvazia', async () => {
      setSession('token-de-teste', bruno)
      comments = [comment()]
      const created = comment({
        id: '00000000-0000-4000-8000-0000000000c3',
        body: 'Já revi o rodapé.',
        createdAt: '2026-11-11T10:00:00.000Z',
      })
      const fetchMock = routes({ [`POST /tasks/${current.id}/comments`]: () => json(created, 201) })
      const { wrapper } = await mountView(current)

      await commentForm(wrapper).get('textarea').setValue('  Já revi o rodapé.  ')
      expect(commentForm(wrapper).get('.field-hint').text()).toBe('17/2000 caracteres')
      await commentForm(wrapper).trigger('submit')
      await flushPromises()

      expect(bodyOf(fetchMock, `POST /tasks/${current.id}/comments`)).toEqual({ body: 'Já revi o rodapé.' })
      const items = commentsSection(wrapper).findAll('.comment-list li')
      expect(items.map((li) => li.get('.comment-body').text())).toEqual([
        'Comecei pela página inicial.',
        'Já revi o rodapé.',
      ])
      expect((commentForm(wrapper).get('textarea').element as HTMLTextAreaElement).value).toBe('')
      expect(commentsSection(wrapper).get('[role="status"]').text()).toBe('Comentário publicado.')
      expect(calls(fetchMock).filter((c) => c === `GET /tasks/${current.id}/comments`)).toHaveLength(1)
    })

    it.each([
      ['vazio', '', 'O comentário não pode estar vazio.'],
      ['só com espaços', '   \n  ', 'O comentário não pode estar vazio.'],
      ['com mais de 2000 caracteres', 'a'.repeat(2001), 'O comentário pode ter no máximo 2000 caracteres.'],
    ])('não publica um comentário %s', async (_, body, error) => {
      const fetchMock = routes()
      const { wrapper } = await mountView(current)
      await commentForm(wrapper).get('textarea').setValue(body)
      await commentForm(wrapper).trigger('submit')
      await flushPromises()
      expect(commentForm(wrapper).get('.field-error').text()).toBe(error)
      expect(commentForm(wrapper).get('textarea').attributes('aria-invalid')).toBe('true')
      expect(calls(fetchMock).some((c) => c.startsWith('POST'))).toBe(false)
    })

    it('desativa o botão durante o pedido e, se falhar, mantém o texto e mostra o erro', async () => {
      let respond: (r: Response) => void = () => {}
      routes({
        [`POST /tasks/${current.id}/comments`]: () => new Promise<Response>((resolve) => (respond = resolve)),
      })
      const { wrapper } = await mountView(current)
      await commentForm(wrapper).get('textarea').setValue('Comentário importante')
      await commentForm(wrapper).trigger('submit')
      await flushPromises()

      const submit = commentForm(wrapper).get('button[type="submit"]')
      expect(submit.text()).toBe('A publicar…')
      expect(submit.attributes('disabled')).toBeDefined()

      respond(problem(409, 'PROJECT_ARCHIVED', 'O projeto está arquivado.'))
      await flushPromises()

      expect(commentForm(wrapper).get('.field-error').text()).toBe(
        'O projeto está arquivado e não pode ser alterado.',
      )
      expect((commentForm(wrapper).get('textarea').element as HTMLTextAreaElement).value).toBe(
        'Comentário importante',
      )
      expect(commentForm(wrapper).get('button[type="submit"]').attributes('disabled')).toBeUndefined()
      expect(commentsSection(wrapper).text()).toContain('Ainda não há comentários.')
    })

    it('num projeto arquivado, mostra os comentários mas não o formulário (CL3)', async () => {
      comments = [comment()]
      routes({}, project({ status: 'ARCHIVED' }))
      const { wrapper } = await mountView(current)
      expect(commentsSection(wrapper).findAll('.comment-list li')).toHaveLength(1)
      expect(wrapper.find('form[aria-label="Novo comentário"]').exists()).toBe(false)
    })

    describe('editar e apagar (só o autor, PN15)', () => {
      const own = () => comment({ id: '00000000-0000-4000-8000-0000000000d1', author: { id: ana.id, name: ana.name, status: 'ACTIVE' }, body: 'Texto original' })
      const OWN_ID = '00000000-0000-4000-8000-0000000000d1'

      function ownItem(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper']) {
        const li = commentsSection(wrapper)
          .findAll('.comment-list li')
          .find((item) => item.get('strong').text() === 'Ana Gestora')
        if (!li) throw new Error('Sem o comentário da Ana')
        return li
      }

      it('mostra Editar e Apagar só nos comentários próprios, mesmo ao Gestor', async () => {
        comments = [comment(), own()]
        routes()
        const { wrapper } = await mountView(current)
        const [bruno, ana] = commentsSection(wrapper).findAll('.comment-list li')
        expect(bruno!.findAll('button')).toHaveLength(0)
        expect(ana!.findAll('button').map((b) => b.text())).toEqual(['Editar', 'Apagar'])
      })

      it('edita o comentário e mostra-o com a resposta da API', async () => {
        comments = [own()]
        const fetchMock = routes({
          [`PATCH /comments/${OWN_ID}`]: () =>
            json({ ...own(), body: 'Texto corrigido', editedAt: '2026-11-11T12:00:00.000Z' }),
        })
        const { wrapper } = await mountView(current)
        await ownItem(wrapper).get('button[aria-label="Editar o meu comentário"]').trigger('click')
        const form = ownItem(wrapper).get('form[aria-label="Editar comentário"]')
        expect((form.get('textarea').element as HTMLTextAreaElement).value).toBe('Texto original')

        await form.get('textarea').setValue(' Texto corrigido ')
        await form.trigger('submit')
        await flushPromises()

        expect(bodyOf(fetchMock, `PATCH /comments/${OWN_ID}`)).toEqual({ body: 'Texto corrigido' })
        expect(ownItem(wrapper).find('form').exists()).toBe(false)
        expect(ownItem(wrapper).get('.comment-body').text()).toBe('Texto corrigido')
        expect(ownItem(wrapper).text()).toContain('(editado)')
        expect(commentsSection(wrapper).get('[role="status"]').text()).toBe('Comentário editado.')
      })

      it('não guarda uma edição vazia', async () => {
        comments = [own()]
        const fetchMock = routes()
        const { wrapper } = await mountView(current)
        await ownItem(wrapper).get('button[aria-label="Editar o meu comentário"]').trigger('click')
        const form = ownItem(wrapper).get('form')
        await form.get('textarea').setValue('   ')
        await form.trigger('submit')
        await flushPromises()
        expect(form.get('.field-error').text()).toBe('O comentário não pode estar vazio.')
        expect(calls(fetchMock).some((c) => c.startsWith('PATCH'))).toBe(false)
      })

      it('desativa os botões durante a edição e, se falhar, mantém o texto editado', async () => {
        comments = [own()]
        let respond: (r: Response) => void = () => {}
        routes({ [`PATCH /comments/${OWN_ID}`]: () => new Promise<Response>((resolve) => (respond = resolve)) })
        const { wrapper } = await mountView(current)
        await ownItem(wrapper).get('button[aria-label="Editar o meu comentário"]').trigger('click')
        await ownItem(wrapper).get('textarea').setValue('Texto corrigido')
        await ownItem(wrapper).get('form').trigger('submit')
        await flushPromises()

        expect(ownItem(wrapper).get('button[type="submit"]').text()).toBe('A guardar…')
        expect(ownItem(wrapper).get('button[type="submit"]').attributes('disabled')).toBeDefined()
        expect(button(wrapper, 'Cancelar').attributes('disabled')).toBeDefined()
        expect(commentForm(wrapper).get('button[type="submit"]').attributes('disabled')).toBeDefined()

        respond(problem(403, 'NOT_COMMENT_AUTHOR', 'Só o autor pode alterar este comentário.'))
        await flushPromises()

        expect(ownItem(wrapper).get('.field-error').text()).toBe('Só o autor pode alterar este comentário.')
        expect((ownItem(wrapper).get('textarea').element as HTMLTextAreaElement).value).toBe('Texto corrigido')
        expect(ownItem(wrapper).get('button[type="submit"]').attributes('disabled')).toBeUndefined()
      })

      it('cancelar a edição volta ao texto sem chamar a API', async () => {
        comments = [own()]
        const fetchMock = routes()
        const { wrapper } = await mountView(current)
        await ownItem(wrapper).get('button[aria-label="Editar o meu comentário"]').trigger('click')
        await ownItem(wrapper).get('textarea').setValue('Outra coisa')
        await button(wrapper, 'Cancelar').trigger('click')
        expect(ownItem(wrapper).get('.comment-body').text()).toBe('Texto original')
        expect(calls(fetchMock).some((c) => c.startsWith('PATCH'))).toBe(false)
      })

      it('apaga o comentário só depois de confirmar e tira-o da lista', async () => {
        comments = [comment(), own()]
        const fetchMock = routes({ [`DELETE /comments/${OWN_ID}`]: () => new Response(null, { status: 204 }) })
        const { wrapper } = await mountView(current)
        await ownItem(wrapper).get('button[aria-label="Apagar o meu comentário"]').trigger('click')
        expect(calls(fetchMock).some((c) => c.startsWith('DELETE'))).toBe(false)
        expect(ownItem(wrapper).get('[role="alertdialog"]').text()).toContain('Apagar este comentário?')

        await button(wrapper, 'Sim, apagar').trigger('click')
        await flushPromises()

        expect(calls(fetchMock)).toContain(`DELETE /comments/${OWN_ID}`)
        expect(commentsSection(wrapper).findAll('.comment-list li')).toHaveLength(1)
        expect(commentsSection(wrapper).text()).not.toContain('Texto original')
        expect(commentsSection(wrapper).get('[role="status"]').text()).toBe('Comentário apagado.')
      })

      it('apagar o único comentário mostra a lista vazia', async () => {
        comments = [own()]
        routes({ [`DELETE /comments/${OWN_ID}`]: () => new Response(null, { status: 204 }) })
        const { wrapper } = await mountView(current)
        await ownItem(wrapper).get('button[aria-label="Apagar o meu comentário"]').trigger('click')
        await button(wrapper, 'Sim, apagar').trigger('click')
        await flushPromises()
        expect(commentsSection(wrapper).text()).toContain('Ainda não há comentários.')
      })

      it('desativa os botões durante o pedido e, se apagar falhar, o comentário fica com o erro', async () => {
        comments = [own()]
        let respond: (r: Response) => void = () => {}
        routes({ [`DELETE /comments/${OWN_ID}`]: () => new Promise<Response>((resolve) => (respond = resolve)) })
        const { wrapper } = await mountView(current)
        await ownItem(wrapper).get('button[aria-label="Apagar o meu comentário"]').trigger('click')
        await button(wrapper, 'Sim, apagar').trigger('click')
        await flushPromises()

        expect(button(wrapper, 'A apagar…').attributes('disabled')).toBeDefined()
        expect(button(wrapper, 'Cancelar').attributes('disabled')).toBeDefined()
        expect(commentForm(wrapper).get('button[type="submit"]').attributes('disabled')).toBeDefined()

        respond(problem(409, 'PROJECT_ARCHIVED', 'O projeto está arquivado.'))
        await flushPromises()

        expect(ownItem(wrapper).get('[role="alertdialog"] [role="alert"]').text()).toBe(
          'O projeto está arquivado e não pode ser alterado.',
        )
        expect(ownItem(wrapper).get('.comment-body').text()).toBe('Texto original')
        expect(button(wrapper, 'Sim, apagar').attributes('disabled')).toBeUndefined()
      })

      it('num projeto arquivado, nem o autor vê Editar e Apagar (CL3)', async () => {
        comments = [own()]
        routes({}, project({ status: 'ARCHIVED' }))
        const { wrapper } = await mountView(current)
        expect(ownItem(wrapper).findAll('button')).toHaveLength(0)
      })
    })
  })
})
