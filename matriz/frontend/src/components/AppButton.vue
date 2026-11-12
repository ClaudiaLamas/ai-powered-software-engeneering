<script setup lang="ts">
/**
 * Botão da Matriz. `variant` dá o aspeto (principal ou de perigo); com `busy`,
 * fica desativado e mostra `busyLabel` enquanto o pedido está em curso. Os
 * restantes atributos (por exemplo, `aria-label` ou `@click`) passam para o
 * `<button>`.
 */
withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'danger'
    type?: 'button' | 'submit'
    disabled?: boolean
    busy?: boolean
    /** Texto enquanto `busy`; sem ele, mantém o texto do botão. */
    busyLabel?: string
  }>(),
  { variant: 'default', type: 'button' },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="{ 'btn-primary': variant === 'primary', 'btn-danger': variant === 'danger' }"
    :disabled="disabled || busy"
    :aria-busy="busy ? 'true' : undefined"
  >
    <template v-if="busy && busyLabel">{{ busyLabel }}</template>
    <slot v-else />
  </button>
</template>
