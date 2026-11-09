<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { setUnauthenticatedHandler } from '@/api/http'
import { session } from '@/auth/session'
import AppHeader from '@/components/AppHeader.vue'

const router = useRouter()

// Token expirado, inválido ou de uma conta desativada (D06): a sessão já foi
// apagada pelo cliente HTTP; volta ao ecrã de entrada com o aviso.
setUnauthenticatedHandler(() => {
  void router.replace({ name: 'login', query: { motivo: 'expirou' } })
})
</script>

<template>
  <AppHeader v-if="session.token" />
  <RouterView />
</template>
