<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { apiErrorMessage, apiFieldErrors } from '@/api/errors'
import { type ProjectFormValues, validateProject } from '@/projects/project-validation'
import AppButton from './AppButton.vue'
import ErrorMessage from './ErrorMessage.vue'
import FormField from './FormField.vue'

/**
 * Formulário do nome e da descrição de um projeto (US10, PN12). Valida com as
 * regras do backend e mostra também os erros que a API devolver (`error`).
 * Os valores escritos ficam no formulário se o pedido falhar.
 */
const props = defineProps<{
  initial: ProjectFormValues
  submitting: boolean
  error?: unknown
}>()

const emit = defineEmits<{ submit: [values: ProjectFormValues]; cancel: [] }>()

const values = reactive<ProjectFormValues>({ ...props.initial })
const attempted = ref(false)
const serverErrors = ref<Record<string, string>>({})

const clientErrors = computed(() => (attempted.value ? validateProject(values) : {}))
const nameError = computed(() => clientErrors.value.name ?? serverErrors.value.name)
const descriptionError = computed(
  () => clientErrors.value.description ?? serverErrors.value.description,
)
const formError = computed(() => {
  if (!props.error) return null
  const fields = Object.keys(apiFieldErrors(props.error))
  if (fields.some((f) => f === 'name' || f === 'description')) return null
  return apiErrorMessage(props.error, 'Não foi possível guardar o projeto.')
})

watch(
  () => props.error,
  (e) => (serverErrors.value = e ? apiFieldErrors(e) : {}),
)
watch(
  () => values.name,
  () => delete serverErrors.value.name,
)
watch(
  () => values.description,
  () => delete serverErrors.value.description,
)

function submit() {
  if (props.submitting) return
  attempted.value = true
  if (Object.keys(validateProject(values)).length > 0) return
  emit('submit', { ...values })
}
</script>

<template>
  <form class="stack" novalidate aria-label="Editar projeto" @submit.prevent="submit">
    <FormField v-model="values.name" label="Nome" :error="nameError" :disabled="submitting" />
    <FormField
      v-model="values.description"
      label="Descrição (opcional)"
      multiline
      :error="descriptionError"
      :disabled="submitting"
    />
    <ErrorMessage v-if="formError" :message="formError" />
    <div class="actions">
      <AppButton type="submit" variant="primary" :busy="submitting" busy-label="A guardar…">
        Guardar
      </AppButton>
      <AppButton :disabled="submitting" @click="emit('cancel')">Cancelar</AppButton>
    </div>
  </form>
</template>
