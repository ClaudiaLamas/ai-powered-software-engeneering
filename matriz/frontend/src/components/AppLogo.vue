<script setup lang="ts">
/**
 * Logótipo da Matriz: uma grelha 3×3 (a "matriz") num quadrado com a cor de
 * destaque, com uma escada de células acesas da esquerda para a direita, como
 * o trabalho a avançar. É decorativo: o nome "Matriz" vai sempre em texto ao
 * lado ou no nome acessível da ligação.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 28 })

const cells = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ({ row, col })))
/** Células acesas: a diagonal que sobe (por fazer → em curso → concluída). */
const isLit = (row: number, col: number) => row + col === 2
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
      :class="{ 'app-logo-cell-lit': isLit(c.row, c.col) }"
      :x="5 + c.col * 8"
      :y="5 + c.row * 8"
      width="6"
      height="6"
      rx="1.5"
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
  opacity: 0.35;
}
.app-logo-cell-lit {
  opacity: 1;
}
</style>
