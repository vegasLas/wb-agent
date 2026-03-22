<template>
  <MenuItem v-slot="{ active, disabled: itemDisabled }" :disabled="disabled">
    <button
      :class="[
        'flex w-full items-center px-4 py-2 text-sm transition-colors',
        active ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300',
        itemDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ]"
      @click="handleClick"
    >
      <component 
        :is="icon" 
        v-if="icon" 
        :class="[
          'mr-3 h-5 w-5',
          active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
        ]" 
      />
      <slot />
    </button>
  </MenuItem>
</template>

<script setup lang="ts">
import { MenuItem } from '@headlessui/vue';
import type { Component } from 'vue';

interface Props {
  icon?: Component;
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  click: [];
}>();

const handleClick = () => {
  emit('click');
};
</script>
