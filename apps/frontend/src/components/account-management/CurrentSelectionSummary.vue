<template>
  <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      Текущий выбор:
    </h4>
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <DevicePhoneMobileIcon class="w-4 h-4 text-blue-500" />
        <span class="text-sm"
          >Аккаунт:
          {{
            selectedAccount
              ? !selectedAccount.phoneWb
                ? 'Номер не указан'
                : selectedAccount.phoneWb
              : 'Не выбран'
          }}</span
        >
      </div>
      <div class="flex items-center gap-2">
        <BuildingStorefrontIcon class="w-4 h-4 text-green-500" />
        <span class="text-sm"
          >Поставщик: {{ selectedSupplier?.supplierName || 'Не выбран' }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DevicePhoneMobileIcon, BuildingStorefrontIcon } from '@heroicons/vue/24/outline';
import type { Account, Supplier } from '../../stores/user';

interface Props {
  selectedAccount: Account | null;
  selectedSupplier: Supplier | null;
}

defineProps<Props>();
</script>
