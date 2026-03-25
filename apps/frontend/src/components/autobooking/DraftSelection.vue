<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Черновик поставки <span class="text-red-500">*</span>
    </label>
    <BaseSelect
      :model-value="modelValue || ''"
      :options="options"
      placeholder="Выберите черновик"
      @update:model-value="(value) => $emit('update:modelValue', value)"
    />
    <div v-if="modelValue" class="flex justify-end">
      <BaseButton
        size="sm"
        variant="soft"
        color="blue"
        :loading="loading"
        @click="$emit('view-goods', modelValue)"
      >
        <EyeIcon class="w-4 h-4 mr-1" />
        товары
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon } from '@heroicons/vue/24/outline';
import { BaseButton, BaseSelect } from '../ui';

interface Props {
  modelValue?: string;
  options: Array<{ label: string; value: string }>;
  loading?: boolean;
}

defineProps<Props>();

defineEmits<{
  'update:modelValue': [value: string];
  'view-goods': [draftId: string];
}>();
</script>
