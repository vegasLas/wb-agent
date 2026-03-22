<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] px-4">
    <div class="text-center">
      <div class="text-6xl font-bold text-gray-300 mb-4">404</div>
      <div class="text-red-500 w-16 h-16 mb-4 mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 class="text-2xl font-semibold mb-2">{{ title }}</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">{{ message }}</p>
      <button
        v-if="showButton"
        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        @click="onRetry"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
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
