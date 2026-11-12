<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Task, TaskStatus } from '@/api/types'
import { TASK_STATUS_LABELS, TASK_STATUS_OPTIONS, assigneesLabel } from '@/tasks/task-labels'
import AppButton from './AppButton.vue'
import EmptyState from './EmptyState.vue'
import ErrorMessage from './ErrorMessage.vue'
import LoadingIndicator from './LoadingIndicator.vue'
import SelectField from './SelectField.vue'
import TaskPriorityBadge from './TaskPriorityBadge.vue'

/**
 * Grupo de tarefas de um estado (US08, wireframe ecrã 2), com o total real
 * (`countsByStatus`) e "Ver mais" para a página seguinte (US23). Com
 * `canChangeStatus`, cada cartão tem o seletor de estado (US07).
 */
defineProps<{
  status: TaskStatus
  tasks: Task[]
  total: number
  loading: boolean
  error: string | null
  /** Qualquer membro muda o estado num projeto ativo (US07, PN09). */
  canChangeStatus?: boolean
  /** Bloqueia os seletores enquanto há uma mudança de estado em curso. */
  changingStatus?: boolean
  /** Muda quando uma mudança de estado falha, para o seletor voltar ao estado real. */
  revision?: number
}>()

defineEmits<{ more: []; retry: []; 'change-status': [task: Task, status: TaskStatus] }>()
</script>

<template>
  <section class="card stack task-group" :aria-label="TASK_STATUS_LABELS[status]">
    <h2 class="task-group-title">{{ TASK_STATUS_LABELS[status] }} ({{ total }})</h2>
    <ul v-if="tasks.length > 0" class="task-list">
      <li v-for="task in tasks" :key="task.id" class="task-item">
        <RouterLink :to="{ name: 'task', params: { taskId: task.id } }">{{ task.title }}</RouterLink>
        <span class="task-meta">
          <TaskPriorityBadge :priority="task.priority" />
          <span class="muted">{{ assigneesLabel(task.assignees) }}</span>
        </span>
        <SelectField
          v-if="canChangeStatus"
          :key="`${task.id}-${revision ?? 0}`"
          class="task-status-field"
          :model-value="task.status"
          label="Estado"
          :accessible-label="`Estado de ${task.title}`"
          :options="TASK_STATUS_OPTIONS"
          :disabled="changingStatus"
          @update:model-value="(next) => $emit('change-status', task, next)"
        />
      </li>
    </ul>
    <EmptyState v-else-if="!loading && !error" message="Sem tarefas neste estado" />
    <ErrorMessage v-if="error" :message="error" retryable @retry="$emit('retry')" />
    <LoadingIndicator v-if="loading" label="A carregar tarefas…" />
    <AppButton v-else-if="!error && tasks.length < total" @click="$emit('more')">
      Ver mais ({{ total - tasks.length }})
    </AppButton>
  </section>
</template>
