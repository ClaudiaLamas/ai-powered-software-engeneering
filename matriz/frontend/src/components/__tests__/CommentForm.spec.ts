import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CommentForm from '../CommentForm.vue'

function mountForm(props: Partial<InstanceType<typeof CommentForm>['$props']> = {}) {
  return mount(CommentForm, {
    props: {
      label: 'Novo comentário',
      submitLabel: 'Comentar',
      submittingLabel: 'A publicar…',
      submitting: false,
      ...props,
    },
  })
}

describe('CommentForm (US13, PN15)', () => {
  it('começa com o texto inicial e conta os caracteres sem os espaços das pontas', async () => {
    const wrapper = mountForm({ initial: 'Olá' })
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Olá')
    expect(wrapper.get('.field-hint').text()).toBe('3/2000 caracteres')
    await wrapper.get('textarea').setValue('  Olá mundo  ')
    expect(wrapper.get('.field-hint').text()).toBe('9/2000 caracteres')
  })

  it('emite o texto quando é válido', async () => {
    const wrapper = mountForm()
    await wrapper.get('textarea').setValue('Comentário')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toEqual([['Comentário']])
  })

  it('não emite um texto só com espaços e mostra o erro só depois de tentar', async () => {
    const wrapper = mountForm()
    await wrapper.get('textarea').setValue('   ')
    expect(wrapper.find('.field-error').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('.field-error').text()).toBe('O comentário não pode estar vazio.')
  })

  it('mostra o erro do pedido até o texto mudar', async () => {
    const wrapper = mountForm({ initial: 'Texto', error: 'Só o autor pode alterar este comentário.' })
    expect(wrapper.get('.field-error').text()).toBe('Só o autor pode alterar este comentário.')
    await wrapper.get('textarea').setValue('Texto novo')
    expect(wrapper.find('.field-error').exists()).toBe(false)
  })

  it('durante o pedido, desativa o campo e o botão e mostra o texto de espera', () => {
    const wrapper = mountForm({ submitting: true })
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').text()).toBe('A publicar…')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('com outro pedido em curso, não deixa submeter', async () => {
    const wrapper = mountForm({ disabled: true })
    await wrapper.get('textarea').setValue('Comentário')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('reset() volta ao texto inicial', async () => {
    const wrapper = mountForm()
    await wrapper.get('textarea').setValue('Comentário')
    wrapper.vm.reset()
    await wrapper.vm.$nextTick()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
  })
})
