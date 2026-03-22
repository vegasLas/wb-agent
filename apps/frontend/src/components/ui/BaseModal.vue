<template>
  <TransitionRoot appear :show="modelValue" as="template">
    <Dialog as="div" class="relative z-50" @close="closeModal">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              :class="[
                'w-full transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all',
                sizeClasses[size],
              ]"
            >
              <!-- Header -->
              <div v-if="title || $slots.header" class="flex items-center justify-between mb-4">
                <DialogTitle
                  as="h3"
                  class="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                >
                  <slot name="title">{{ title }}</slot>
                </DialogTitle>
                <button
                  v-if="!noCloseButton"
                  class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  @click="closeModal"
                >
                  <XMarkIcon class="w-6 h-6" />
                </button>
              </div>

              <!-- Content -->
              <div class="text-gray-700 dark:text-gray-300">
                <slot />
              </div>

              <!-- Footer -->
              <div v-if="$slots.footer" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <slot name="footer" />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

interface Props {
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  noCloseButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  noCloseButton: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

function closeModal() {
  emit('update:modelValue', false);
  emit('close');
}
</script>
