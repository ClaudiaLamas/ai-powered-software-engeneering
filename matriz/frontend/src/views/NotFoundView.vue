<script setup lang="ts">
import { RouterLink } from 'vue-router'

/**
 * Endereço desconhecido. Só aparece com sessão: sem sessão, a guarda de rotas
 * manda para o ecrã de entrada, como nas outras rotas (US15).
 */
</script>

<template>
  <main class="page stack">
    <h1>Página não encontrada</h1>
    <p class="muted">O endereço que abriu não existe.</p>
    <p><RouterLink :to="{ name: 'home' }">Ir para o painel</RouterLink></p>
  </main>
</template>
