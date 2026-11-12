<script setup lang="ts">
import type { ProjectStatus } from '@/api/types'
import { PROJECT_STATUS_LABELS } from '@/projects/project-labels'

defineProps<{ status: ProjectStatus }>()
</script>

<template>
  <span class="badge" :class="`badge-project-${status.toLowerCase()}`">
    <span class="visually-hidden">Estado do projeto: </span>{{ PROJECT_STATUS_LABELS[status] }}
  </span>
</template>
