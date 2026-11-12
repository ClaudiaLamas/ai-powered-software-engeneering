<script setup lang="ts">
/** Mensagem para uma lista sem elementos (por exemplo, sem projetos ou sem comentários). */
defineProps<{ message: string }>()
</script>

<template>
  <p class="muted empty-state">{{ message }}</p>
</template>
