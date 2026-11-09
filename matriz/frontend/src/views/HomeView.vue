<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError } from '@/api/http'
import type { Account } from '@/api/types'
import { loadMe } from '@/auth/auth-api'

// Ecrã inicial provisório: mostra a conta autenticada (GET /me). A lista de
// projetos (US05, ecrã 1 do wireframe) entra com os endpoints de projetos.
const account = ref<Account | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    account.value = await loadMe()
  } catch (e) {
    // Um 401 já terminou a sessão e voltou ao ecrã de entrada (cliente HTTP).
    if (e instanceof ApiError && e.status === 401) return
    error.value = 'Não foi possível carregar a sua conta. Tente outra vez.'
  }
})
</script>

<template>
  <main class="page stack">
    <p v-if="error" role="alert" class="alert">{{ error }}</p>
    <p v-else-if="!account" class="muted">A carregar a sua conta…</p>
    <template v-else>
      <h1>Olá, {{ account.name }}</h1>
      <section class="card stack" aria-label="A sua conta">
        <dl class="account">
          <dt>Email</dt>
          <dd>{{ account.email }}</dd>
          <template v-if="account.isAdmin">
            <dt>Permissões</dt>
            <dd>Permissão de Administrador</dd>
          </template>
        </dl>
      </section>
    </template>
  </main>
</template>

<style scoped>
.account {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
}
.account dt {
  font-weight: 600;
}
.account dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
