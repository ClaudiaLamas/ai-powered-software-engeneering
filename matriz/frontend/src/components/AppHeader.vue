<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { logout } from '@/auth/auth-api'
import { session } from '@/auth/session'
import AppButton from './AppButton.vue'

const router = useRouter()

/** Sair (US15): a sessão é apagada logo e volta-se ao ecrã de entrada. */
async function signOut() {
  await logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="topbar-brand" aria-label="Matriz: ir para o painel">Matriz</RouterLink>
    <span class="topbar-account">
      <span class="muted topbar-name">{{ session.account?.name }}</span>
      <AppButton @click="signOut">Sair</AppButton>
    </span>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem var(--gutter);
  border-bottom: 1px solid var(--color-border);
}
.topbar-brand {
  font-weight: 700;
  color: var(--color-heading);
  text-decoration: none;
}
.topbar-account {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.topbar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
