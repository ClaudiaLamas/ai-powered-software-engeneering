<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { apiErrorMessage, apiFieldErrors } from '@/api/errors'
import { DEFAULT_TASK_PRIORITY, TASK_PRIORITY_OPTIONS } from '@/tasks/task-labels'
import { type TaskFormValues, validateTask } from '@/tasks/task-validation'
import FormField from './FormField.vue'
import SelectField from './SelectField.vue'

/**
 * Formulário de tarefa (título, descrição e prioridade), para criar e para
 * editar (US06, US22). Valida com as regras do backend e mostra também os
 * erros que a API devolver (`error`). Os valores escritos ficam no formulário
 * se o pedido falhar; o pai chama `reset()` depois de criar.
 */
const props = defineProps<{
  initial?: Partial<TaskFormValues>
  submitLabel: string
  submittingLabel: string
  submitting: boolean
  /** Erro do último pedido (um `ApiError` ou outro). */
  error?: unknown
}>()

const emit = defineEmits<{ submit: [values: TaskFormValues]; cancel: [] }>()

function initialValues(): TaskFormValues {
  return {
    title: props.initial?.title ?? '',
    description: props.initial?.description ?? '',
    priority: props.initial?.priority ?? DEFAULT_TASK_PRIORITY,
  }
}

const values = reactive<TaskFormValues>(initialValues())
// Os erros por campo só aparecem depois da primeira tentativa.
const attempted = ref(false)
const serverErrors = ref<Record<string, string>>({})

const clientErrors = computed(() => (attempted.value ? validateTask(values) : {}))
const titleError = computed(() => clientErrors.value.title ?? serverErrors.value.title)
const descriptionError = computed(
  () => clientErrors.value.description ?? serverErrors.value.description,
)
/** Erro do pedido que não pertence a nenhum campo do formulário. */
const formError = computed(() => {
  if (!props.error) return null
  const fields = Object.keys(apiFieldErrors(props.error))
  if (fields.some((f) => f === 'title' || f === 'description')) return null
  return apiErrorMessage(props.error, 'Não foi possível guardar a tarefa.')
})

watch(
  () => props.error,
  (e) => (serverErrors.value = e ? apiFieldErrors(e) : {}),
)
// Um erro da API num campo desaparece quando a pessoa o altera.
watch(
  () => values.title,
  () => delete serverErrors.value.title,
)
watch(
  () => values.description,
  () => delete serverErrors.value.description,
)

function submit() {
  if (props.submitting) return
  attempted.value = true
  if (Object.keys(validateTask(values)).length > 0) return
  emit('submit', { ...values })
}

function reset() {
  Object.assign(values, initialValues())
  attempted.value = false
  serverErrors.value = {}
}

defineExpose({ reset })
</script>

<template>
  <form class="stack" novalidate @submit.prevent="submit">
    <FormField v-model="values.title" label="Título" :error="titleError" :disabled="submitting" />
    <FormField
      v-model="values.description"
      label="Descrição (opcional)"
      multiline
      :error="descriptionError"
      :disabled="submitting"
    />
    <SelectField
      v-model="values.priority"
      label="Prioridade"
      :options="TASK_PRIORITY_OPTIONS"
      :disabled="submitting"
    />
    <p v-if="formError" role="alert" class="alert">{{ formError }}</p>
    <div class="actions">
      <button type="submit" class="btn btn-primary" :disabled="submitting">
        {{ submitting ? submittingLabel : submitLabel }}
      </button>
      <slot name="actions" />
    </div>
  </form>
</template>
