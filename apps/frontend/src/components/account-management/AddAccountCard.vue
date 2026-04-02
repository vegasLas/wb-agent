<template>
  <div
    class="flex items-center justify-between p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
    @click="$emit('add-account')"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
      >
        <i class="pi pi-plus text-gray-500 dark:text-gray-400" />
      </div>
      <div>
        <div class="font-medium">
          Добавить аккаунт
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Авторизовать дополнительный WB аккаунт
        </div>
      </div>
    </div>
    <i class="pi pi-arrow-right text-gray-400 dark:text-gray-500" />
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'add-account': [];
}>();
</script>
