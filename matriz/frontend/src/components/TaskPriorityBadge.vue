<script setup lang="ts">
import type { TaskPriority } from '@/api/types'
import { TASK_PRIORITY_LABELS } from '@/tasks/task-labels'

defineProps<{ priority: TaskPriority }>()
</script>

<template>
  <span class="badge" :class="`badge-priority-${priority.toLowerCase()}`">
    <span class="visually-hidden">Prioridade </span>{{ TASK_PRIORITY_LABELS[priority] }}
  </span>
</template>
