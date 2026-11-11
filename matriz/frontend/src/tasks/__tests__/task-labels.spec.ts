import { describe, expect, it } from 'vitest'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  accountLabel,
  assigneeLabel,
  assigneesLabel,
} from '../task-labels'

describe('etiquetas das tarefas', () => {
  it('mostra os estados em português, pela ordem dos grupos (R8)', () => {
    expect(TASK_STATUS_LABELS).toEqual({ TODO: 'Por fazer', IN_PROGRESS: 'Em curso', DONE: 'Concluída' })
    expect(TASK_STATUS_OPTIONS.map((o) => o.value)).toEqual(['TODO', 'IN_PROGRESS', 'DONE'])
  })

  it('mostra as prioridades em português, da mais baixa para a mais alta (FN12)', () => {
    expect(TASK_PRIORITY_LABELS).toEqual({ LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' })
    expect(TASK_PRIORITY_OPTIONS.map((o) => o.label)).toEqual(['Baixa', 'Média', 'Alta'])
  })
})

describe('assigneeLabel (DE14)', () => {
  const rui = { id: 'r', name: 'Rui', status: 'ACTIVE' as const, isProjectMember: true }

  it.each([
    ['membro com conta ativa', rui, 'Rui'],
    ['já não é membro', { ...rui, isProjectMember: false }, 'Rui (já não é membro)'],
    ['conta desativada', { ...rui, status: 'DEACTIVATED' as const }, 'Rui (conta desativada)'],
    [
      'as duas situações: "conta desativada" tem precedência',
      { ...rui, status: 'DEACTIVATED' as const, isProjectMember: false },
      'Rui (conta desativada)',
    ],
  ])('%s', (_, assignee, label) => {
    expect(assigneeLabel(assignee)).toBe(label)
  })
})

describe('assigneesLabel (DE16)', () => {
  const ana = { id: 'a', name: 'Ana', status: 'ACTIVE' as const, isProjectMember: true }
  const rui = { id: 'r', name: 'Rui', status: 'ACTIVE' as const, isProjectMember: false }

  it('sem responsáveis, mostra "Sem responsável"', () => {
    expect(assigneesLabel([])).toBe('Sem responsável')
  })

  it('junta os responsáveis pela ordem da API, cada um com a sua indicação', () => {
    expect(assigneesLabel([ana, rui])).toBe('Ana, Rui (já não é membro)')
  })

  it('mostra o nome de uma conta, com "conta desativada" quando é o caso (CL12)', () => {
    expect(accountLabel({ id: '1', name: 'Ana', status: 'ACTIVE' })).toBe('Ana')
    expect(accountLabel({ id: '1', name: 'Ana', status: 'DEACTIVATED' })).toBe('Ana (conta desativada)')
  })
})
