<script setup lang="ts">
import { computed, useId } from 'vue'

/** Campo de formulário com etiqueta, ajuda opcional e mensagem de erro acessível. */
const props = defineProps<{
  label: string
  type?: string
  autocomplete?: string
  error?: string | null
  /** Texto com várias linhas (`<textarea>`), por exemplo uma descrição. */
  multiline?: boolean
  disabled?: boolean
  /** Texto de ajuda junto ao campo (por exemplo, um contador de caracteres). */
  hint?: string
}>()

const model = defineModel<string>({ required: true })
const id = useId()
const describedBy = computed(
  () =>
    [props.hint ? `${id}-hint` : null, props.error ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ') || undefined,
)
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
      :aria-describedby="describedBy"
    />
    <input
      v-else
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="describedBy"
    />
    <p v-if="hint" :id="`${id}-hint`" class="field-hint">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</p>
  </div>
</template>
