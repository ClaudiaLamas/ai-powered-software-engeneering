import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskPriorityBadge from '../TaskPriorityBadge.vue'
import TaskStatusBadge from '../TaskStatusBadge.vue'

describe('badges de estado e de prioridade', () => {
  it('o estado aparece com a etiqueta em português', () => {
    const wrapper = mount(TaskStatusBadge, { props: { status: 'IN_PROGRESS' } })
    expect(wrapper.text()).toBe('Em curso')
    expect(wrapper.classes()).toContain('badge-status-in_progress')
  })

  it('a prioridade aparece com a etiqueta em português', () => {
    const wrapper = mount(TaskPriorityBadge, { props: { priority: 'HIGH' } })
    expect(wrapper.text()).toBe('Prioridade Alta')
    expect(wrapper.classes()).toContain('badge-priority-high')
  })
})
