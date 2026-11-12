<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { apiErrorMessage, apiFieldErrors } from '@/api/errors'
import type { AccountSummary } from '@/api/types'
import { DEFAULT_TASK_PRIORITY, TASK_PRIORITY_OPTIONS } from '@/tasks/task-labels'
import { type TaskFormValues, validateTask } from '@/tasks/task-validation'
import FormField from './FormField.vue'
import SelectField from './SelectField.vue'
import AppButton from './AppButton.vue'
import ErrorMessage from './ErrorMessage.vue'

/**
 * Formulário de tarefa (título, descrição e prioridade), para criar e para
 * editar (US06, US22). Com `assignableAccounts` (só ao criar), mostra também
 * a escolha dos responsáveis (DE16). Valida com as regras do backend e mostra também os
 * erros que a API devolver (`error`). Os valores escritos ficam no formulário
 * se o pedido falhar; o pai chama `reset()` depois de criar.
 */
const props = defineProps<{
  initial?: Partial<TaskFormValues>
  submitLabel: string
  submittingLabel: string
  submitting: boolean
  /** Impede submeter (por exemplo, com outro pedido em curso), sem bloquear os campos. */
  disabled?: boolean
  /** Erro do último pedido (um `ApiError` ou outro). */
  error?: unknown
  /** Quem pode ser responsável (`listAssignableAccounts`); sem isto, não há escolha. */
  assignableAccounts?: AccountSummary[]
}>()

const emit = defineEmits<{ submit: [values: TaskFormValues]; cancel: [] }>()

function initialValues(): TaskFormValues {
  return {
    title: props.initial?.title ?? '',
    description: props.initial?.description ?? '',
    priority: props.initial?.priority ?? DEFAULT_TASK_PRIORITY,
    assigneeIds: [],
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
const assigneesError = computed(() => serverErrors.value.assigneeIds)
const assigneesId = useId()
/** Erro do pedido que não pertence a nenhum campo do formulário. */
const formError = computed(() => {
  if (!props.error) return null
  const fields = Object.keys(apiFieldErrors(props.error))
  if (fields.some((f) => f === 'title' || f === 'description' || f === 'assigneeIds')) return null
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
watch(
  () => [...(values.assigneeIds ?? [])],
  () => delete serverErrors.value.assigneeIds,
)

function submit() {
  if (props.submitting || props.disabled) return
  attempted.value = true
  if (Object.keys(validateTask(values)).length > 0) return
  const { assigneeIds, ...fields } = values
  // Sem escolha de responsáveis (ao editar), o pedido não os leva.
  emit('submit', props.assignableAccounts ? { ...fields, assigneeIds: [...(assigneeIds ?? [])] } : fields)
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
    <fieldset
      v-if="assignableAccounts"
      class="assignee-choices"
      :aria-describedby="assigneesError ? `${assigneesId}-error` : undefined"
    >
      <legend>Responsáveis (opcional)</legend>
      <p v-if="assignableAccounts.length === 0" class="muted">
        Não há membros com a conta ativa para escolher.
      </p>
      <label v-for="account in assignableAccounts" :key="account.id" class="checkbox">
        <input
          v-model="values.assigneeIds"
          type="checkbox"
          :value="account.id"
          :disabled="submitting"
        />
        {{ account.name }}
      </label>
      <p v-if="assigneesError" :id="`${assigneesId}-error`" class="field-error">
        {{ assigneesError }}
      </p>
    </fieldset>
    <ErrorMessage v-if="formError" :message="formError" />
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
