<script setup lang="ts">
import { useId } from 'vue'

/** Campo de formulário com etiqueta e mensagem de erro acessível. */
defineProps<{
  label: string
  type?: string
  autocomplete?: string
  error?: string | null
  /** Texto com várias linhas (`<textarea>`), por exemplo uma descrição. */
  multiline?: boolean
  disabled?: boolean
}>()

const model = defineModel<string>({ required: true })
const id = useId()
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <textarea
      v-if="multiline"
      :id="id"
      v-model="model"
      rows="4"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="error ? `${id}-error` : undefined"
    />
    <input
      v-else
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="error ? `${id}-error` : undefined"
    />
    <p v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</p>
  </div>
</template>
