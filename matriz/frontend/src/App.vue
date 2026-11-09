<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { setUnauthenticatedHandler } from '@/api/http'
import { loadMe, logout } from '@/auth/auth-api'
import { isAuthenticated, session } from '@/auth/session'

const router = useRouter()

// Token expirado ou conta desativada (D06): volta ao ecrã de entrada com aviso.
setUnauthenticatedHandler(() => {
  void router.replace({ name: 'login', query: { motivo: 'expirou' } })
})

onMounted(() => {
  // Depois de recarregar a página só há o token: carrega o nome da conta.
  if (isAuthenticated() && !session.account) void loadMe().catch(() => {})
})

async function signOut() {
  await logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <header v-if="session.token" class="topbar">
    <strong>Matriz</strong>
    <span class="row">
      <span class="muted">{{ session.account?.name }}</span>
      <button type="button" @click="signOut">Sair</button>
    </span>
  </header>
  <RouterView />
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}
.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.muted {
  opacity: 0.75;
}
button {
  font: inherit;
  padding: 0.25rem 0.75rem;
}
</style>
