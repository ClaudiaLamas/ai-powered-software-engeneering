<script setup lang="ts">
import { useRouter } from 'vue-router'
import { logout } from '@/auth/auth-api'
import { session } from '@/auth/session'

const router = useRouter()

/** Sair (US15): a sessão é apagada logo e volta-se ao ecrã de entrada. */
async function signOut() {
  await logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <header class="topbar">
    <strong>Matriz</strong>
    <span class="topbar-account">
      <span class="muted topbar-name">{{ session.account?.name }}</span>
      <button type="button" class="btn" @click="signOut">Sair</button>
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
