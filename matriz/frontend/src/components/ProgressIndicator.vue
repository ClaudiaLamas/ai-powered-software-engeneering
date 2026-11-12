<script setup lang="ts">
import type { Progress } from '@/api/types'
import { progressCountsLabel, progressPercentLabel } from '@/projects/project-labels'

/**
 * Indicador de progresso de um projeto (US05, US09, PN13): barra, percentagem
 * e contagens por estado de todas as tarefas; sem tarefas, só "Sem tarefas".
 */
defineProps<{
  progress: Progress
  /** Nome do projeto, para o nome acessível da barra. */
  projectName: string
}>()
</script>

<template>
  <div class="progress">
    <div
      v-if="progress.total > 0"
      class="progress-bar"
      role="progressbar"
      :aria-label="`Progresso de ${projectName}`"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progress.percentDone ?? 0"
    >
      <i :style="{ width: `${progress.percentDone ?? 0}%` }" />
    </div>
    <div v-else class="progress-bar" aria-hidden="true" />
    <p class="muted" data-test="progress-percent">{{ progressPercentLabel(progress) }}</p>
    <p v-if="progress.total > 0" class="muted" data-test="progress-counts">
      {{ progressCountsLabel(progress) }}
    </p>
  </div>
</template>
