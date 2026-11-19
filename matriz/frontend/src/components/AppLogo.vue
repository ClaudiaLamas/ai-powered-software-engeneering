<script setup lang="ts">
/**
 * Logótipo da Matriz: uma grelha 5×5 (a "matriz") num quadrado com a cor de
 * destaque, com as células acesas a formar um M. É decorativo: o nome
 * "Matriz" vai sempre em texto ao lado ou no nome acessível da ligação.
 * O mesmo desenho está em public/favicon.svg.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 28 })

/** O M: 1 = célula acesa. */
const PATTERN = ['10001', '11011', '10101', '10001', '10001']

const cells = PATTERN.flatMap((line, row) =>
  [...line].map((bit, col) => ({ row, col, lit: bit === '1' })),
)
</script>

<template>
  <svg
    class="app-logo"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    aria-hidden="true"
    focusable="false"
  >
    <rect class="app-logo-tile" width="32" height="32" rx="8" />
    <rect
      v-for="c in cells"
      :key="`${c.row}-${c.col}`"
      class="app-logo-cell"
      :class="{ 'app-logo-cell-lit': c.lit }"
      :x="4 + c.col * 5"
      :y="4 + c.row * 5"
      width="4"
      height="4"
      rx="1"
    />
  </svg>
</template>

<style scoped>
.app-logo {
  flex: none;
  display: block;
}
.app-logo-tile {
  fill: var(--color-accent);
}
.app-logo-cell {
  fill: var(--color-accent-text);
  opacity: 0.2;
}
.app-logo-cell-lit {
  opacity: 1;
}
</style>
