<template>
  <div class="flex items-center justify-between py-1">
    <span class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</span>
    <div class="text-sm font-medium text-right max-w-[50%]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
}

defineProps<Props>();
</script>
