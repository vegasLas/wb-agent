<template>
  <div class="field flex flex-col gap-1">
    <label
      v-if="label"
      :for="name"
      class="text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500 dark:text-red-400"
      >*</span>
    </label>
    <slot :invalid="!!error" />
    <small
      v-if="error"
      class="p-error text-xs text-red-500 dark:text-red-400"
    >{{ error }}</small>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string;
  name?: string;
  error?: string;
  required?: boolean;
}

defineProps<Props>();
</script>
