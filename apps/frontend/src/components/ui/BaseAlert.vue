<template>
  <div
    :class="[
      'rounded-lg p-4 flex items-start gap-3',
      colorClasses[color],
    ]"
  >
    <component :is="iconComponent" class="w-5 h-5 flex-shrink-0 mt-0.5" />
    <div class="flex-1 min-w-0">
      <h3 v-if="title" class="font-medium mb-1">{{ title }}</h3>
      <p v-if="description" class="text-sm opacity-90">{{ description }}</p>
      <slot />
    </div>
    <button
      v-if="!noClose"
      class="text-current opacity-60 hover:opacity-100 transition-opacity"
      @click="$emit('close')"
    >
      <XMarkIcon class="w-5 h-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';

interface Props {
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'primary';
  title?: string;
  description?: string;
  icon?: 'warning' | 'info' | 'success' | 'error';
  noClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
  noClose: true,
});

defineEmits<{
  close: [];
}>();

const colorClasses = {
  red: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800',
  primary: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800',
};

const iconComponent = computed(() => {
  if (props.icon === 'warning') return ExclamationTriangleIcon;
  if (props.icon === 'info') return InformationCircleIcon;
  if (props.icon === 'success') return CheckCircleIcon;
  if (props.icon === 'error') return XCircleIcon;
  
  // Default icons based on color
  if (props.color === 'red') return XCircleIcon;
  if (props.color === 'yellow') return ExclamationTriangleIcon;
  if (props.color === 'green') return CheckCircleIcon;
  return InformationCircleIcon;
});
</script>
