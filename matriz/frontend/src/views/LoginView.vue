<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { login } from '@/auth/auth-api'
import { validateLogin } from '@/auth/login-validation'
import AppButton from '@/components/AppButton.vue'
import AppLogo from '@/components/AppLogo.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import FormField from '@/components/FormField.vue'
import { safeRedirect } from '@/router/guard'

const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)
// Os erros por campo só aparecem depois da primeira tentativa de entrar.
const attempted = ref(false)

const sessionExpired = computed(() => route.query.motivo === 'expirou')
const fieldErrors = computed(() =>
  attempted.value ? validateLogin({ email: email.value, password: password.value }) : {},
)

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'O email ou a palavra-passe estão errados.',
  ACCOUNT_DEACTIVATED: 'Esta conta foi desativada.',
  VALIDATION_ERROR: 'Indique um email válido e a palavra-passe.',
}

const SERVER_UNAVAILABLE = 'Não foi possível contactar o servidor. Tente outra vez.'

/**
 * Mensagem para um erro do login. Um erro 5xx (por exemplo, o backend sem base
 * de dados ou o proxy do Vite sem backend) ou uma falha de rede não têm a ver
 * com a conta: dizem que o servidor não respondeu.
 */
function loginErrorMessage(e: unknown): string {
  if (!(e instanceof ApiError) || e.status >= 500) return SERVER_UNAVAILABLE
  return MESSAGES[e.code] ?? e.detail ?? 'Não foi possível entrar.'
}

async function submit() {
  if (submitting.value) return
  attempted.value = true
  error.value = null
  if (Object.keys(fieldErrors.value).length > 0) return

  submitting.value = true
  try {
    await login(email.value, password.value)
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    error.value = loginErrorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="page-narrow stack">
    <h1 class="login-brand"><AppLogo :size="64" />Matriz</h1>
    <p v-if="sessionExpired && !error" role="status" class="notice notice-warning">
      A sessão expirou. Inicie sessão novamente.
    </p>
    <form class="stack" novalidate @submit.prevent="submit">
      <FormField
        v-model="email"
        label="Email"
        type="email"
        autocomplete="username"
        :error="fieldErrors.email"
      />
      <FormField
        v-model="password"
        label="Palavra-passe"
        type="password"
        autocomplete="current-password"
        :error="fieldErrors.password"
      />
      <ErrorMessage v-if="error" :message="error" />
      <AppButton type="submit" variant="primary" :busy="submitting" busy-label="A entrar…">
        Entrar
      </AppButton>
    </form>
  </main>
</template>

<style scoped>
.login-brand {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: 2.75rem;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-2);
}
</style>
