/** Erros por campo do formulário de entrada; vazio quando é válido. */
export interface LoginErrors {
  email?: string
  password?: string
}

// Formato simples: algo@domínio.extensão, sem espaços. O backend valida também.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Valida o formulário antes de chamar a API (US01). */
export function validateLogin(values: { email: string; password: string }): LoginErrors {
  const errors: LoginErrors = {}
  const email = values.email.trim()
  if (!email) errors.email = 'Indique o email.'
  else if (!EMAIL.test(email)) errors.email = 'Indique um email válido, por exemplo nome@empresa.pt.'
  if (!values.password) errors.password = 'Indique a palavra-passe.'
  return errors
}
