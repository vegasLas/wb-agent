<template>
  <div class="text-center py-8 text-gray-500 dark:text-gray-400">
    <i
      class="pi pi-exclamation-triangle text-5xl mx-auto mb-2 opacity-50 block"
    />
    <p>У выбранного аккаунта нет поставщиков</p>
    <Button
      size="small"
      variant="outlined"
      class="mt-3"
      :loading="refreshingSuppliers"
      @click="$emit('refresh')"
    >
      Попробовать обновить
    </Button>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

interface Props {
  refreshingSuppliers: boolean;
}

defineProps<Props>();
defineEmits<{
  refresh: [];
}>();
</script>
