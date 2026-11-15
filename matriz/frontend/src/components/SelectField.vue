<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'

/** Lista de escolha com etiqueta; os valores são os técnicos e as etiquetas as mostradas. */
defineProps<{
  label: string
  options: { value: T; label: string }[]
  disabled?: boolean
  error?: string | null
  /** Nome acessível mais completo do que a etiqueta visível (por exemplo, com o título da tarefa). */
  accessibleLabel?: string
}>()

const model = defineModel<T>({ required: true })
const id = useId()
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      :disabled="disabled"
      :aria-label="accessibleLabel"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="error ? `${id}-error` : undefined"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</p>
  </div>
</template>
