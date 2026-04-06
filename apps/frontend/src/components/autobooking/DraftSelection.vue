<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Черновик поставки <span class="text-red-500 dark:text-red-400">*</span>
    </label>
    <Select
      :model-value="modelValue || ''"
      :options="options"
      option-label="label"
      option-value="value"
      placeholder="Выберите черновик"
      :loading="loading"
      class="w-full"
      @update:model-value="(value) => $emit('update:modelValue', value)"
    />
    <div
      v-if="modelValue"
      class="flex justify-end"
    >
      <Button
        size="small"
        severity="secondary"
        :loading="loading"
        @click="$emit('view-goods', modelValue)"
      >
        <i class="pi pi-eye mr-1" />
        товары
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Select from 'primevue/select';

interface Props {
  modelValue?: string;
  options: Array<{ label: string; value: string }>;
  loading?: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  'update:modelValue': [value: string];
  'view-goods': [draftId: string];
}>();
</script>
