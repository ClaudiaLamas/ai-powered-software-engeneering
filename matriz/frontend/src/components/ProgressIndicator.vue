<script setup lang="ts">
import type { Progress } from '@/api/types'
import { progressCountsLabel, progressPercentLabel } from '@/projects/project-labels'

/**
 * Indicador de progresso de um projeto (US05, US09, PN13): barra, percentagem
 * e contagens por estado de todas as tarefas; sem tarefas, só "Sem tarefas".
 * A barra tem um segmento por estado (concluída, em curso, por fazer), com as
 * cores dos grupos; o valor acessível continua a ser a percentagem concluída.
 */
const props = defineProps<{
  progress: Progress
  /** Nome do projeto, para o nome acessível da barra. */
  projectName: string
}>()

function share(count: number) {
  return `${(count / props.progress.total) * 100}%`
}
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
      <i class="progress-done" :style="{ width: `${progress.percentDone ?? 0}%` }" />
      <i class="progress-in-progress" :style="{ width: share(progress.inProgress) }" />
      <i v-if="progress.todo > 0" class="progress-todo" />
    </div>
    <div v-else class="progress-bar" aria-hidden="true" />
    <p class="muted" data-test="progress-percent">{{ progressPercentLabel(progress) }}</p>
    <p v-if="progress.total > 0" class="muted" data-test="progress-counts">
      {{ progressCountsLabel(progress) }}
    </p>
  </div>
</template>
