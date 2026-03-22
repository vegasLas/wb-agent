<template>
  <div
    class="flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
    :class="{
      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': isSelected,
      'border-gray-200 dark:border-gray-700': !isSelected,
    }"
    @click="$emit('select', account.id)"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
      >
        <DevicePhoneMobileIcon class="w-5 h-5 text-white" />
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
      <BaseButton
        color="red"
        variant="ghost"
        size="sm"
        square
        @click.stop="$emit('remove', account.id)"
      >
        <TrashIcon class="w-4 h-4" />
      </BaseButton>
      <div v-if="isSelected" class="text-blue-600 flex">
        <CheckCircleIcon class="w-5 h-5" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';
import { BaseButton } from '../ui';
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
