import { describe, expect, it } from 'vitest'
import {
  COMMENT_BODY_MAX,
  COMMENT_EMPTY_MESSAGE,
  COMMENT_TOO_LONG_MESSAGE,
  commentLength,
  formatDateTime,
  validateCommentBody,
} from '../comment-validation'

describe('validateCommentBody (PN15, como o backend)', () => {
  it.each([
    ['com um caráter', 'a'],
    ['no máximo', 'a'.repeat(COMMENT_BODY_MAX)],
    ['no máximo, com espaços nas pontas', `  ${'a'.repeat(COMMENT_BODY_MAX)}  `],
    ['no máximo, com emojis (pontos de código)', '😀'.repeat(COMMENT_BODY_MAX)],
  ])('aceita um comentário %s', (_, body) => {
    expect(validateCommentBody(body)).toBeNull()
  })

  it.each([
    ['vazio', ''],
    ['só com espaços', '   '],
    ['só com mudanças de linha', '\n\n\t'],
  ])('recusa um comentário %s', (_, body) => {
    expect(validateCommentBody(body)).toBe(COMMENT_EMPTY_MESSAGE)
  })

  it('recusa um comentário longo demais', () => {
    expect(validateCommentBody('a'.repeat(COMMENT_BODY_MAX + 1))).toBe(COMMENT_TOO_LONG_MESSAGE)
  })

  it('conta os caracteres sem os espaços das pontas', () => {
    expect(commentLength('  olá  ')).toBe(3)
    expect(commentLength('😀😀')).toBe(2)
  })
})

describe('formatDateTime', () => {
  it('mostra a data e a hora em português de Portugal', () => {
    expect(formatDateTime('2026-11-11T21:59:00.000Z', 'UTC')).toBe('11/11/2026, 21:59')
  })

  it('usa o fuso horário indicado', () => {
    expect(formatDateTime('2026-07-11T21:59:00.000Z', 'Europe/Lisbon')).toBe('11/07/2026, 22:59')
  })
})
