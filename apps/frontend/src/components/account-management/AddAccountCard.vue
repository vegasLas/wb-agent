<template>
  <div
    class="flex items-center justify-between p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
    @click="$emit('add-account')"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
      >
        <PlusIcon class="w-5 h-5 text-gray-500" />
      </div>
      <div>
        <div class="font-medium">Добавить аккаунт</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Авторизовать дополнительный WB аккаунт
        </div>
      </div>
    </div>
    <ArrowRightIcon class="w-5 h-5 text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, ArrowRightIcon } from '@heroicons/vue/24/outline';

defineEmits<{
  'add-account': [];
}>();
</script>
