import { clearSession, getToken } from '@/auth/session'
import type { Problem } from './types'

/** Erro da API, com o `code` estável do contrato. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail?: string
  readonly errors?: Problem['errors']

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title)
    this.name = 'ApiError'
    this.status = problem.status
    this.code = problem.code
    this.detail = problem.detail
    this.errors = problem.errors
  }
}

let onUnauthenticated: () => void = () => {}

/** O que fazer quando um pedido com sessão recebe `401` (token expirado ou conta desativada). */
export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Envia o token (por omissão). `false` para login e ativação. */
  auth?: boolean
}

/** Pedido à API. O Vite encaminha `/api` para o backend (vite.config.ts). */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (auth && token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => undefined)
  if (res.ok) return data as T

  const problem: Problem =
    data && typeof data === 'object' && 'code' in data
      ? (data as Problem)
      : { type: 'about:blank', title: 'Erro', status: res.status, code: 'UNKNOWN_ERROR' }

  if (res.status === 401 && auth) {
    clearSession()
    onUnauthenticated()
  }
  throw new ApiError(problem)
}
