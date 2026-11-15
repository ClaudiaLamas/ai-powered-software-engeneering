<script setup lang="ts">
/** Indicação de carregamento, anunciada aos leitores de ecrã. */
withDefaults(defineProps<{ label?: string }>(), { label: 'A carregar…' })
</script>

<template>
  <p class="muted loading" role="status">{{ label }}</p>
</template>
