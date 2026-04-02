<template>
  <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      Текущий выбор:
    </h4>
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <i class="pi pi-mobile text-blue-500 dark:text-blue-400" />
        <span class="text-sm">Аккаунт:
          {{
            selectedAccount
              ? !selectedAccount.phoneWb
                ? 'Номер не указан'
                : selectedAccount.phoneWb
              : 'Не выбран'
          }}</span>
      </div>
      <div class="flex items-center gap-2">
        <i class="pi pi-building text-green-500 dark:text-green-400" />
        <span class="text-sm">Поставщик: {{ selectedSupplier?.supplierName || 'Не выбран' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Account, Supplier } from '../../stores/user';

interface Props {
  selectedAccount: Account | null;
  selectedSupplier: Supplier | null;
}

defineProps<Props>();
</script>
