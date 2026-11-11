import { describe, expect, it } from 'vitest'
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MESSAGE,
  TITLE_MAX,
  TITLE_MESSAGE,
  TITLE_MIN,
  toTaskPayload,
  validateTask,
} from '../task-validation'

describe('validateTask (PN12, como o backend)', () => {
  it.each([
    ['no mínimo', 'a'.repeat(TITLE_MIN)],
    ['no máximo', 'a'.repeat(TITLE_MAX)],
    ['no máximo, com espaços nas pontas', `  ${'a'.repeat(TITLE_MAX)}  `],
    ['no máximo, com acentos', 'é'.repeat(TITLE_MAX)],
    ['no máximo, com emojis (pontos de código)', '😀'.repeat(TITLE_MAX)],
  ])('aceita um título %s', (_, title) => {
    expect(validateTask({ title, description: '' })).toEqual({})
  })

  it.each([
    ['vazio', ''],
    ['só com espaços', '     '],
    ['curto demais', 'ab'],
    ['curto demais depois de aparado', '  ab  '],
    ['longo demais', 'a'.repeat(TITLE_MAX + 1)],
  ])('recusa um título %s', (_, title) => {
    expect(validateTask({ title, description: '' })).toEqual({ title: TITLE_MESSAGE })
  })

  it('aceita uma descrição até 2000 caracteres e uma só com espaços', () => {
    expect(validateTask({ title: 'Rever', description: 'a'.repeat(DESCRIPTION_MAX) })).toEqual({})
    expect(validateTask({ title: 'Rever', description: ' '.repeat(DESCRIPTION_MAX + 5) })).toEqual({})
  })

  it('recusa uma descrição com mais de 2000 caracteres', () => {
    expect(validateTask({ title: 'Rever', description: 'a'.repeat(DESCRIPTION_MAX + 1) })).toEqual({
      description: DESCRIPTION_MESSAGE,
    })
  })
})

describe('toTaskPayload', () => {
  it('envia os valores técnicos, o título aparado e a descrição vazia como null', () => {
    expect(toTaskPayload({ title: '  Rever textos ', description: '   ', priority: 'HIGH' })).toEqual({
      title: 'Rever textos',
      description: null,
      priority: 'HIGH',
    })
  })
})
