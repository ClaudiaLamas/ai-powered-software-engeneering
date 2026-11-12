<script setup lang="ts">
import AppButton from './AppButton.vue'

/** Mensagem de erro anunciada aos leitores de ecrã, com "Tentar outra vez" opcional. */
defineProps<{
  message: string
  /** Mostra "Tentar outra vez" e emite `retry`. */
  retryable?: boolean
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error-message">
    <p role="alert" class="alert">{{ message }}</p>
    <AppButton v-if="retryable" @click="$emit('retry')">Tentar outra vez</AppButton>
  </div>
</template>
