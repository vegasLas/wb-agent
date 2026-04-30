<template>
  <div
    v-if="visible"
    class="p-4 rounded-xl"
    :class="containerClass"
  >
    <div class="flex items-start gap-3">
      <i
        v-if="effectiveIcon"
        :class="[effectiveIcon, 'mt-0.5']"
      />
      <div :class="textClass">
        <p v-if="title" class="font-medium">{{ title }}</p>
        <p>{{ message }}</p>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  visible?: boolean;
  severity: 'error' | 'success' | 'warning' | 'info';
  message: string;
  title?: string;
  icon?: string;
}

const props = defineProps<Props>();

const containerClass = computed(() => {
  switch (props.severity) {
    case 'error':
      return 'bg-red-500/10 border border-red-500/20';
    case 'success':
      return 'bg-green-500/10 border border-green-500/20';
    case 'warning':
      return 'bg-yellow-500/10 border border-yellow-500/20';
    case 'info':
      return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
    default:
      return '';
  }
});

const textClass = computed(() => {
  switch (props.severity) {
    case 'error':
      return 'text-red-500 text-sm';
    case 'success':
      return 'text-green-500 text-sm';
    case 'warning':
      return 'text-yellow-500 text-sm';
    case 'info':
      return 'text-blue-600 dark:text-blue-400 text-sm';
    default:
      return 'text-sm';
  }
});

const effectiveIcon = computed(() => {
  if (props.icon) return props.icon;
  switch (props.severity) {
    case 'error':
      return 'pi pi-exclamation-circle text-red-500';
    case 'success':
      return 'pi pi-check-circle text-green-500';
    case 'warning':
      return 'pi pi-clock text-yellow-500';
    case 'info':
      return 'pi pi-info-circle text-blue-500 text-2xl';
    default:
      return '';
  }
});
</script>
