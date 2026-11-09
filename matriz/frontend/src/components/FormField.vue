<script setup lang="ts">
import { useId } from 'vue'

/** Campo de formulário com etiqueta e mensagem de erro acessível. */
defineProps<{
  label: string
  type?: string
  autocomplete?: string
  error?: string | null
}>()

const model = defineModel<string>({ required: true })
const id = useId()
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="error ? `${id}-error` : undefined"
    />
    <p v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</p>
  </div>
</template>
