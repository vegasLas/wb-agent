<template>
  <div
    class="flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
    :class="{
      'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20':
        isSelected,
      'border-gray-200 dark:border-gray-700': !isSelected,
    }"
    @click="$emit('select', supplier.supplierId)"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center"
      >
        <i class="pi pi-shop text-white" />
      </div>
      <div>
        <div class="font-medium">
          {{ supplier.supplierName }}
        </div>
      </div>
    </div>
    <div
      v-if="isSelected"
      class="text-blue-600 dark:text-blue-400"
    >
      <i class="pi pi-check-circle" />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Supplier {
  supplierId: string;
  supplierName: string;
}

interface Props {
  supplier: Supplier;
  isSelected: boolean;
}

defineProps<Props>();
defineEmits<{
  select: [supplierId: string];
}>();
</script>
