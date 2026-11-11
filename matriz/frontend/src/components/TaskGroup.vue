<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Task, TaskStatus } from '@/api/types'
import { TASK_STATUS_LABELS, assigneesLabel } from '@/tasks/task-labels'
import TaskPriorityBadge from './TaskPriorityBadge.vue'

/**
 * Grupo de tarefas de um estado (US08, wireframe ecrã 2), com o total real
 * (`countsByStatus`) e "Ver mais" para a página seguinte (US23).
 */
defineProps<{
  status: TaskStatus
  tasks: Task[]
  total: number
  loading: boolean
  error: string | null
}>()

defineEmits<{ more: []; retry: [] }>()
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
      </li>
    </ul>
    <p v-else-if="!loading && !error" class="muted">Sem tarefas neste estado</p>
    <p v-if="error" role="alert" class="alert">
      {{ error }}
      <button type="button" class="btn" @click="$emit('retry')">Tentar outra vez</button>
    </p>
    <p v-if="loading" class="muted" role="status">A carregar tarefas…</p>
    <button
      v-else-if="!error && tasks.length < total"
      type="button"
      class="btn"
      @click="$emit('more')"
    >
      Ver mais ({{ total - tasks.length }})
    </button>
  </section>
</template>
