<script setup lang="ts">
import type { TaskStatus } from '@/api/types'
import { TASK_STATUS_LABELS } from '@/tasks/task-labels'

defineProps<{ status: TaskStatus }>()
</script>

<template>
  <span class="badge" :class="`badge-status-${status.toLowerCase()}`">
    {{ TASK_STATUS_LABELS[status] }}
  </span>
</template>
