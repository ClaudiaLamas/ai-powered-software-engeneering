/*
 * Mesmas regras do backend (PN12, backend/src/projects/project-rules.ts): o
 * nome conta sem os espaços das pontas; os comprimentos contam pontos de
 * código, como o PostgreSQL. O backend volta a validar.
 */
export const NAME_MIN = 3
export const NAME_MAX = 100
export const DESCRIPTION_MAX = 1000

export const NAME_MESSAGE = `O nome é obrigatório e tem de ter entre ${NAME_MIN} e ${NAME_MAX} caracteres.`
export const DESCRIPTION_MESSAGE = `A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`

export interface ProjectFormValues {
  name: string
  description: string
}

export interface ProjectFormErrors {
  name?: string
  description?: string
}

function charLength(text: string): number {
  return [...text].length
}

/** Erros por campo do formulário de projeto; vazio quando é válido. */
export function validateProject(values: ProjectFormValues): ProjectFormErrors {
  const errors: ProjectFormErrors = {}
  const name = charLength(values.name.trim())
  if (name < NAME_MIN || name > NAME_MAX) errors.name = NAME_MESSAGE
  if (values.description.trim() !== '' && charLength(values.description) > DESCRIPTION_MAX) {
    errors.description = DESCRIPTION_MESSAGE
  }
  return errors
}

/** Corpo do pedido: nome aparado e descrição vazia como `null` (PN12). */
export function toProjectPayload(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() === '' ? null : values.description,
  }
}
