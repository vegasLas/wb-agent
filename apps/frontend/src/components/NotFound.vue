<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] px-4">
    <div class="text-center">
      <div class="text-6xl font-bold text-gray-300 mb-4">404</div>
      <div class="text-red-500 w-16 h-16 mb-4 mx-auto">
        <i class="pi pi-exclamation-triangle text-6xl"></i>
      </div>
      <h2 class="text-2xl font-semibold mb-2">{{ title }}</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">{{ message }}</p>
      <Button
        v-if="showButton"
        severity="primary"
        :label="buttonText"
        @click="onRetry"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

withDefaults(defineProps<{
  title?: string;
  message?: string;
  buttonText?: string;
  showButton?: boolean;
}>(), {
  title: 'Страница не найдена',
  message: 'Извините, запрашиваемая страница не существует',
  buttonText: 'Попробовать снова',
  showButton: false,
});

const emit = defineEmits<{
  retry: [];
}>();

const onRetry = () => {
  emit('retry');
};
</script>
