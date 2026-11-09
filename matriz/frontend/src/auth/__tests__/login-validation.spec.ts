import { describe, expect, it } from 'vitest'
import { validateLogin } from '../login-validation'

describe('validateLogin', () => {
  it('aceita um email válido e uma palavra-passe', () => {
    expect(validateLogin({ email: 'ana@exemplo.test', password: 'x' })).toEqual({})
  })

  it('aceita espaços à volta do email (o backend apara-os)', () => {
    expect(validateLogin({ email: '  ana@exemplo.test ', password: 'x' })).toEqual({})
  })

  it('pede o email e a palavra-passe quando estão vazios', () => {
    expect(validateLogin({ email: '  ', password: '' })).toEqual({
      email: 'Indique o email.',
      password: 'Indique a palavra-passe.',
    })
  })

  it.each(['ana', 'ana@', '@exemplo.test', 'ana exemplo@test', 'ana@exemplo'])(
    'recusa o email "%s"',
    (email) => {
      expect(validateLogin({ email, password: 'x' })).toEqual({
        email: 'Indique um email válido, por exemplo nome@empresa.pt.',
      })
    },
  )
})
