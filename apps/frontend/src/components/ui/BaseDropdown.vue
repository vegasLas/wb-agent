<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton as="template">
      <slot name="trigger" />
    </MenuButton>
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <MenuItems
        class="absolute z-10 mt-2 w-56 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        :class="[placementClasses]"
      >
        <div class="py-1">
          <slot />
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Menu, MenuButton, MenuItems } from '@headlessui/vue';

interface Props {
  placement?: 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-start',
});

const placementClasses = computed(() => {
  const classes = {
    'bottom-start': 'left-0 origin-top-left',
    'bottom-end': 'right-0 origin-top-right',
    'bottom': 'left-1/2 -translate-x-1/2 origin-top',
    'top-start': 'left-0 bottom-full origin-bottom-left mb-2',
    'top-end': 'right-0 bottom-full origin-bottom-right mb-2',
    'top': 'left-1/2 -translate-x-1/2 bottom-full origin-bottom mb-2',
  };
  return classes[props.placement];
});
</script>
