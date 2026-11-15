<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

/**
 * Caminho até ao ecrã atual (Painel › Projeto › Tarefa). O último elemento é
 * o ecrã atual e não é uma ligação.
 */
defineProps<{ items: { label: string; to?: RouteLocationRaw }[] }>()
</script>

<template>
  <nav class="breadcrumbs" aria-label="Caminho">
    <ol>
      <li v-for="(item, i) in items" :key="i">
        <RouterLink v-if="item.to && i < items.length - 1" :to="item.to">{{ item.label }}</RouterLink>
        <span v-else aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
