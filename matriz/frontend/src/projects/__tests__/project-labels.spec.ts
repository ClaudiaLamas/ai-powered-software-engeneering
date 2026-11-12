import { describe, expect, it } from 'vitest'
import { PROJECT_ROLE_LABELS, progressCountsLabel, progressPercentLabel } from '../project-labels'

describe('etiquetas do projeto', () => {
  it('mostra a função na equipa em português', () => {
    expect(PROJECT_ROLE_LABELS).toEqual({ MANAGER: 'Gestor', MEMBER: 'Membro' })
  })

  it('mostra as contagens por estado (US05, US09)', () => {
    const progress = { todo: 1, inProgress: 0, done: 3, total: 4, percentDone: 75 }
    expect(progressCountsLabel(progress)).toBe('Por fazer: 1, Em curso: 0, Concluída: 3')
    expect(progressPercentLabel(progress)).toBe('75% concluído')
  })

  it('mostra "Sem tarefas" e nenhuma percentagem quando não há tarefas (PN13, CL7)', () => {
    const progress = { todo: 0, inProgress: 0, done: 0, total: 0, percentDone: null }
    expect(progressPercentLabel(progress)).toBe('Sem tarefas')
  })
})
