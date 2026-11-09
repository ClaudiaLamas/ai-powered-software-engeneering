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
