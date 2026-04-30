<template>
  <div class="space-y-1.5">
    <label
      v-if="label"
      class="block text-sm font-medium text-secondary"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
      <span v-else-if="optional" class="text-xs text-secondary/60">(необязательно)</span>
    </label>
    <slot />
    <small
      v-if="showError && error"
      class="p-error text-xs mt-1 block"
    >
      {{ error }}
    </small>
    <p
      v-else-if="hint"
      class="text-xs text-secondary/60 mt-1"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string;
  error?: string;
  showError?: boolean;
  required?: boolean;
  optional?: boolean;
  hint?: string;
}

defineProps<Props>();
</script>
