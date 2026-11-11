import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/http'
import TaskForm from '../TaskForm.vue'

const labels = { submitLabel: 'Criar tarefa', submittingLabel: 'A criar…' }

function mountForm(props: Partial<InstanceType<typeof TaskForm>['$props']> = {}) {
  return mount(TaskForm, { props: { ...labels, submitting: false, ...props } })
}

describe('TaskForm', () => {
  it('com o título vazio, mostra o erro e não envia (US06)', async () => {
    const wrapper = mountForm()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('.field-error').text()).toBe(
      'O título é obrigatório e tem de ter entre 3 e 150 caracteres.',
    )
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('envia os valores, com a prioridade "Média" por omissão (US22)', async () => {
    const wrapper = mountForm()
    await wrapper.get('input').setValue('Rever textos')
    await wrapper.get('textarea').setValue('Na página inicial.')
    expect(wrapper.get('select').element.selectedOptions[0]!.text).toBe('Média')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')![0]).toEqual([
      { title: 'Rever textos', description: 'Na página inicial.', priority: 'MEDIUM' },
    ])
  })

  it('sem assignableAccounts não mostra a escolha de responsáveis nem os envia (editar)', () => {
    const wrapper = mountForm()
    expect(wrapper.find('fieldset').exists()).toBe(false)
  })

  it('com assignableAccounts, envia os responsáveis escolhidos (DE16)', async () => {
    const wrapper = mountForm({
      assignableAccounts: [
        { id: 'a', name: 'Ana Gestora', status: 'ACTIVE' },
        { id: 'b', name: 'Bruno Membro', status: 'ACTIVE' },
      ],
    })
    expect(wrapper.get('fieldset legend').text()).toBe('Responsáveis (opcional)')
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes.map((b) => b.element.parentElement!.textContent!.trim())).toEqual([
      'Ana Gestora',
      'Bruno Membro',
    ])
    await wrapper.get('input').setValue('Rever textos')
    await boxes[1]!.setValue(true)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')![0]).toEqual([
      { title: 'Rever textos', description: '', priority: 'MEDIUM', assigneeIds: ['b'] },
    ])
  })

  it('sem ninguém escolhido, envia assigneeIds vazio; sem membros ativos, avisa', async () => {
    const wrapper = mountForm({ assignableAccounts: [] })
    expect(wrapper.get('fieldset').text()).toContain('Não há membros com a conta ativa para escolher.')
    await wrapper.get('input').setValue('Rever textos')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')![0]).toEqual([
      { title: 'Rever textos', description: '', priority: 'MEDIUM', assigneeIds: [] },
    ])
  })

  it('mostra no grupo dos responsáveis o erro da API em assigneeIds', async () => {
    const wrapper = mountForm({ assignableAccounts: [{ id: 'a', name: 'Ana', status: 'ACTIVE' }] })
    await wrapper.setProps({
      error: new ApiError({
        type: 'about:blank',
        title: 'Dados inválidos',
        status: 400,
        code: 'ASSIGNEE_NOT_MEMBER',
        detail: 'O responsável tem de ser membro do projeto.',
        errors: [{ field: 'assigneeIds', message: 'O responsável tem de ser membro do projeto.' }],
      }),
    })
    expect(wrapper.get('fieldset .field-error').text()).toBe('O responsável tem de ser membro do projeto.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('as opções de prioridade mostram as etiquetas e enviam o valor técnico', async () => {
    const wrapper = mountForm()
    const options = wrapper.findAll('select option')
    expect(options.map((o) => o.text())).toEqual(['Baixa', 'Média', 'Alta'])
    await wrapper.get('select').setValue('HIGH')
    await wrapper.get('input').setValue('Rever textos')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')![0]![0]).toMatchObject({ priority: 'HIGH' })
  })

  it('mostra o erro de campo devolvido pela API e tira-o quando o campo muda', async () => {
    const wrapper = mountForm()
    await wrapper.get('input').setValue('Rever')
    await wrapper.setProps({
      error: new ApiError({
        type: 'about:blank',
        title: 'Dados inválidos',
        status: 400,
        code: 'DESCRIPTION_TOO_LONG',
        detail: 'A descrição pode ter no máximo 2000 caracteres.',
        errors: [{ field: 'description', message: 'A descrição pode ter no máximo 2000 caracteres.' }],
      }),
    })
    expect(wrapper.get('.field-error').text()).toBe('A descrição pode ter no máximo 2000 caracteres.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    await wrapper.get('textarea').setValue('Mais curta')
    expect(wrapper.find('.field-error').exists()).toBe(false)
  })

  it('mostra um erro da API sem campo como alerta', async () => {
    const wrapper = mountForm({
      error: new ApiError({
        type: 'about:blank',
        title: 'Conflito',
        status: 409,
        code: 'PROJECT_ARCHIVED',
        detail: 'O projeto está arquivado.',
      }),
    })
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'O projeto está arquivado e não pode ser alterado.',
    )
  })

  it('durante o pedido, desativa o botão e os campos', () => {
    const wrapper = mountForm({ submitting: true })
    const button = wrapper.get('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('A criar…')
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  })

  it('começa com os valores iniciais (editar) e reset() volta a eles', async () => {
    const wrapper = mountForm({ initial: { title: 'Rever textos', description: '', priority: 'LOW' } })
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Rever textos')
    await wrapper.get('input').setValue('Outro título')
    ;(wrapper.vm as unknown as { reset: () => void }).reset()
    await wrapper.vm.$nextTick()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Rever textos')
  })
})
