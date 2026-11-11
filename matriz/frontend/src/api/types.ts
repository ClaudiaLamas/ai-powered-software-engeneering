/** Conta completa (`Account` em openapi.yaml). */
export interface Account {
  id: string
  name: string
  email: string
  status: 'PENDING' | 'ACTIVE' | 'DEACTIVATED'
  isAdmin: boolean
  isSystemAccount: boolean
  createdAt: string
}

/** Resposta de `POST /auth/login`. */
export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  account: Account
}

/** Erro no formato Problem Details (RFC 9457). */
export interface Problem {
  type: string
  title: string
  status: number
  code: string
  detail?: string
  errors?: { field: string; message: string }[]
}

export type AccountStatus = Account['status']

/** Resumo de uma conta (`AccountSummary`). */
export interface AccountSummary {
  id: string
  name: string
  status: AccountStatus
}

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED'
export type ProjectRole = 'MANAGER' | 'MEMBER'

/** Indicador de progresso (`Progress`, PN13). */
export interface Progress {
  todo: number
  inProgress: number
  done: number
  total: number
  percentDone: number | null
}

export interface ProjectMember {
  account: AccountSummary
  role: ProjectRole
  addedAt: string
}

/** Projeto visto por um membro (`Project`, US09, US18). */
export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  manager: AccountSummary
  members: ProjectMember[]
  progress: Progress
  createdAt: string
}

/** Valores técnicos da API; as etiquetas estão em `tasks/task-labels.ts`. */
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

/** Responsável de uma tarefa (`Assignee`, PN07, PN08). */
export interface Assignee extends AccountSummary {
  isProjectMember: boolean
}

/** Tarefa (`Task`). */
export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  /** Por ordem do nome (DE16); vazia = "Sem responsável". */
  assignees: Assignee[]
  createdAt: string
  updatedAt: string
}

/** Contagens por estado, com o filtro de prioridade e sem o de estado (`TaskCountsByStatus`). */
export interface TaskCountsByStatus {
  todo: number
  inProgress: number
  done: number
}

/** Uma página das tarefas de um projeto (`TaskPage`, PN20). */
export interface TaskPage {
  items: Task[]
  total: number
  page: number
  pageSize: number
  countsByStatus: TaskCountsByStatus
}
