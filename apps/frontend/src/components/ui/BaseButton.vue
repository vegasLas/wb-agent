<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="mr-2">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    <span v-else-if="icon" class="mr-2">
      <component :is="icon" class="w-5 h-5" />
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';

interface Props {
  color?: 'primary' | 'gray' | 'yellow' | 'red' | 'green' | 'blue';
  variant?: 'solid' | 'soft' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: Component;
  disabled?: boolean;
  loading?: boolean;
  square?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  color: 'gray',
  variant: 'solid',
  size: 'md',
  disabled: false,
  loading: false,
  square: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  const colorClasses = {
    solid: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
      gray: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300',
      yellow: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 disabled:bg-yellow-300',
      red: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
      green: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300',
      blue: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    },
    soft: {
      primary: 'bg-blue-100 text-blue-800 hover:bg-blue-200 focus:ring-blue-500 disabled:bg-blue-50 disabled:text-blue-400',
      gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-400',
      yellow: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500 disabled:bg-yellow-50 disabled:text-yellow-400',
      red: 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500 disabled:bg-red-50 disabled:text-red-400',
      green: 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500 disabled:bg-green-50 disabled:text-green-400',
      blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200 focus:ring-blue-500 disabled:bg-blue-50 disabled:text-blue-400',
    },
    ghost: {
      primary: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:text-blue-300',
      gray: 'text-gray-600 hover:bg-gray-50 focus:ring-gray-500 disabled:text-gray-300',
      yellow: 'text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500 disabled:text-yellow-300',
      red: 'text-red-600 hover:bg-red-50 focus:ring-red-500 disabled:text-red-300',
      green: 'text-green-600 hover:bg-green-50 focus:ring-green-500 disabled:text-green-300',
      blue: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:text-blue-300',
    },
    outline: {
      primary: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-blue-300 disabled:text-blue-300',
      gray: 'border-2 border-gray-600 text-gray-600 hover:bg-gray-50 focus:ring-gray-500 disabled:border-gray-300 disabled:text-gray-300',
      yellow: 'border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500 disabled:border-yellow-300 disabled:text-yellow-300',
      red: 'border-2 border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500 disabled:border-red-300 disabled:text-red-300',
      green: 'border-2 border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500 disabled:border-green-300 disabled:text-green-300',
      blue: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-blue-300 disabled:text-blue-300',
    },
  };

  const squareClasses = props.square ? 'aspect-square px-0' : '';
  const disabledClasses = (props.disabled || props.loading) ? 'cursor-not-allowed opacity-75' : '';

  return [
    baseClasses,
    sizeClasses[props.size],
    colorClasses[props.variant][props.color],
    squareClasses,
    disabledClasses,
  ].join(' ');
});
</script>
