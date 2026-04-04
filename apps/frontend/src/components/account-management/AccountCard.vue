<template>
  <div
    class="flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
    :class="{
      'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20':
        isSelected,
      'border-gray-200 dark:border-gray-700': !isSelected,
    }"
    @click="$emit('select', account.id)"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
      >
        <i class="pi pi-mobile text-white" />
      </div>
      <div>
        <div class="font-medium">
          {{ account.phoneWb || 'Без номера телефона' }}
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ account.suppliers.length }} поставщик(ов)
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button
        severity="danger"
        text
        size="small"
        @click.stop="$emit('remove', account.id)"
      >
        <i class="pi pi-trash" />
      </Button>
      <div v-if="isSelected" class="text-blue-600 dark:text-blue-400 flex">
        <i class="pi pi-check-circle" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import type { Account } from '../../stores/user';

interface Props {
  account: Account;
  isSelected: boolean;
}

defineProps<Props>();
defineEmits<{
  select: [accountId: string];
  remove: [accountId: string];
}>();
</script>
