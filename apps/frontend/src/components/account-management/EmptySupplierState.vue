<template>
  <div class="text-center py-8 text-gray-500 dark:text-gray-400">
    <ExclamationTriangleIcon class="w-12 h-12 mx-auto mb-2 opacity-50" />
    <p>У выбранного аккаунта нет поставщиков</p>
    <BaseButton
      size="sm"
      variant="outline"
      class="mt-3"
      :loading="refreshingSuppliers"
      @click="$emit('refresh')"
    >
      Попробовать обновить
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import { BaseButton } from '../ui';

interface Props {
  refreshingSuppliers: boolean;
}

defineProps<Props>();
defineEmits<{
  refresh: [];
}>();
</script>
