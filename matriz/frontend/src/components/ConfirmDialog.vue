<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import AppButton from './AppButton.vue'
import ErrorMessage from './ErrorMessage.vue'

/**
 * Confirmação de uma ação que não se pode desfazer (eliminar, apagar,
 * arquivar), mostrada no lugar da ação. Recebe o foco ao abrir.
 */
defineProps<{
  question: string
  confirmLabel: string
  busyLabel: string
  /** Pedido da confirmação em curso. */
  busy: boolean
  /** Impede confirmar (por exemplo, com outro pedido em curso). */
  disabled?: boolean
  error?: string | null
}>()

defineEmits<{ confirm: []; cancel: [] }>()

const id = useId()
const root = ref<HTMLElement | null>(null)
onMounted(() => root.value?.focus())
</script>

<template>
  <div ref="root" role="alertdialog" :aria-labelledby="id" tabindex="-1" class="confirm-dialog stack">
    <p :id="id">{{ question }}</p>
    <ErrorMessage v-if="error" :message="error" />
    <div class="actions">
      <AppButton
        variant="danger"
        :busy="busy"
        :busy-label="busyLabel"
        :disabled="disabled"
        @click="$emit('confirm')"
      >
        {{ confirmLabel }}
      </AppButton>
      <AppButton :disabled="busy" @click="$emit('cancel')">Cancelar</AppButton>
    </div>
  </div>
</template>
