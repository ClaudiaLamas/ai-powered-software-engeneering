<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { login } from '@/auth/auth-api'
import { safeRedirect } from '@/router/guard'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

const sessionExpired = computed(() => route.query.motivo === 'expirou')

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'O email ou a palavra-passe estão errados.',
  ACCOUNT_DEACTIVATED: 'Esta conta foi desativada.',
  VALIDATION_ERROR: 'Indique um email válido e a palavra-passe.',
}

async function submit() {
  error.value = null
  submitting.value = true
  try {
    await login(email.value, password.value)
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    error.value =
      e instanceof ApiError
        ? (MESSAGES[e.code] ?? e.detail ?? 'Não foi possível entrar.')
        : 'Não foi possível contactar o servidor. Tente outra vez.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login">
    <h1>Matriz</h1>
    <p v-if="sessionExpired && !error" role="status" class="notice">
      A sessão expirou. Entre outra vez.
    </p>
    <form novalidate @submit.prevent="submit">
      <label>
        Email
        <input v-model="email" type="email" autocomplete="username" required />
      </label>
      <label>
        Palavra-passe
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <button type="submit" :disabled="submitting">Entrar</button>
    </form>
  </main>
</template>

<style scoped>
.login {
  max-width: 24rem;
  margin: 4rem auto;
  padding: 0 1rem;
}
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
input,
button {
  font: inherit;
  padding: 0.5rem;
}
.error {
  color: #b00020;
}
.notice {
  margin-bottom: 1rem;
}
</style>
