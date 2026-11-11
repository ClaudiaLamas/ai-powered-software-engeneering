import { vi } from 'vitest'
import type { Account, Project, Task, TaskPage } from '../api/types'

/* Dados fictícios e um `fetch` falso que responde por método e caminho. */

export const ana: Account = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ana Gestora',
  email: 'ana@exemplo.test',
  status: 'ACTIVE',
  isAdmin: false,
  isSystemAccount: false,
  createdAt: '2026-11-01T10:00:00.000Z',
}

export const bruno: Account = { ...ana, id: '00000000-0000-4000-8000-000000000002', name: 'Bruno Membro', email: 'bruno@exemplo.test' }

export const PROJECT_ID = '00000000-0000-4000-8000-0000000000a1'

export function project(overrides: Partial<Project> = {}): Project {
  return {
    id: PROJECT_ID,
    name: 'Site',
    description: 'Novo site da empresa.',
    status: 'ACTIVE',
    manager: { id: ana.id, name: ana.name, status: 'ACTIVE' },
    members: [
      { account: { id: ana.id, name: ana.name, status: 'ACTIVE' }, role: 'MANAGER', addedAt: ana.createdAt },
      { account: { id: bruno.id, name: bruno.name, status: 'ACTIVE' }, role: 'MEMBER', addedAt: ana.createdAt },
    ],
    progress: { todo: 0, inProgress: 0, done: 0, total: 0, percentDone: null },
    createdAt: ana.createdAt,
    ...overrides,
  }
}

let seq = 0
export function task(overrides: Partial<Task> = {}): Task {
  seq += 1
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    projectId: PROJECT_ID,
    title: `Tarefa ${seq}`,
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    assignee: null,
    createdAt: ana.createdAt,
    updatedAt: ana.createdAt,
    ...overrides,
  }
}

export function page(items: Task[], counts: TaskPage['countsByStatus'], extra: Partial<TaskPage> = {}): TaskPage {
  return { items, total: items.length, page: 1, pageSize: 20, countsByStatus: counts, ...extra }
}

export function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function problem(status: number, code: string, detail: string, errors?: { field: string; message: string }[]) {
  return new Response(JSON.stringify({ type: 'about:blank', title: 'Erro', status, code, detail, errors }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>

/**
 * `fetch` falso: `routes` liga "MÉTODO /caminho" (sem `/api` nem query) a uma
 * resposta. Um pedido sem rota falha o teste.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input, 'http://localhost')
    const key = `${init.method ?? 'GET'} ${url.pathname.replace(/^\/api/, '')}`
    const handler = routes[key]
    if (!handler) throw new Error(`Pedido inesperado: ${key}`)
    return handler(url, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Pedidos feitos, como "MÉTODO /caminho?query". */
export function calls(fetchMock: ReturnType<typeof mockApi>): string[] {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(input, 'http://localhost')
    return `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api/, '')}${url.search}`
  })
}

export function bodyOf(fetchMock: ReturnType<typeof mockApi>, key: string): unknown {
  const call = fetchMock.mock.calls.find(([input, init]) => {
    const url = new URL(input, 'http://localhost')
    return `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api/, '')}` === key
  })
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined
}
