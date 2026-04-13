<template>
  <div class="grid grid-cols-2 gap-3">
    <Card class="text-center">
      <template #content>
        <div class="text-2xl font-bold text-purple-600">
          {{ totalCount }}
        </div>
        <div class="text-xs text-gray-500">Всего рекламных кампаний</div>
      </template>
    </Card>
    <Card class="text-center">
      <template #content>
        <div class="text-2xl font-bold text-amber-600">
          {{ pauseCount }}
        </div>
        <div class="text-xs text-gray-500">На паузе</div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card';

defineProps<{
  totalCount: number;
  pauseCount: number;
}>();
</script>
