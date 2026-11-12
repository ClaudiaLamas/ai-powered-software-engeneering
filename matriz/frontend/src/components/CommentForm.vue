<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { COMMENT_BODY_MAX, commentLength, validateCommentBody } from '@/tasks/comment-validation'
import FormField from './FormField.vue'
import AppButton from './AppButton.vue'

/**
 * Formulário do texto de um comentário, para comentar e para editar (US13,
 * PN15), com contador de caracteres. Valida com as regras do backend e mostra
 * também o erro do último pedido (`error`). O texto fica no formulário se o
 * pedido falhar; o pai chama `reset()` depois de comentar.
 */
const props = defineProps<{
  label: string
  initial?: string
  submitLabel: string
  submittingLabel: string
  submitting: boolean
  /** Impede submeter (por exemplo, com outro pedido em curso), sem bloquear o campo. */
  disabled?: boolean
  /** Mensagem de erro do último pedido. */
  error?: string | null
}>()

const emit = defineEmits<{ submit: [body: string] }>()

const body = ref(props.initial ?? '')
// O erro de validação só aparece depois da primeira tentativa.
const attempted = ref(false)
const serverError = ref<string | null>(null)

const counter = computed(() => `${commentLength(body.value)}/${COMMENT_BODY_MAX} caracteres`)
const fieldError = computed(
  () => (attempted.value ? validateCommentBody(body.value) : null) ?? serverError.value,
)

watch(
  () => props.error,
  (e) => (serverError.value = e ?? null),
  { immediate: true },
)
// O erro da API desaparece quando a pessoa altera o texto.
watch(body, () => (serverError.value = null))

function submit() {
  if (props.submitting || props.disabled) return
  attempted.value = true
  if (validateCommentBody(body.value)) return
  emit('submit', body.value)
}

function reset() {
  body.value = props.initial ?? ''
  attempted.value = false
  serverError.value = null
}

defineExpose({ reset })
</script>

<template>
  <form class="stack" :aria-label="label" novalidate @submit.prevent="submit">
    <FormField
      v-model="body"
      :label="label"
      multiline
      :hint="counter"
      :error="fieldError"
      :disabled="submitting"
    />
    <div class="actions">
      <AppButton
        type="submit"
        variant="primary"
        :busy="submitting"
        :busy-label="submittingLabel"
        :disabled="disabled"
      >
        {{ submitLabel }}
      </AppButton>
      <slot name="actions" />
    </div>
  </form>
</template>
