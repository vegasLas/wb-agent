<template>
  <div class="space-y-2">
    <!-- Header row -->
    <div v-if="showHeader" class="flex gap-2 pb-2 border-b border-deep-border">
      <Skeleton
        v-for="col in columns"
        :key="`header-${col}`"
        :width="`${100 / columns}%`"
        height="2rem"
        border-radius="0.5rem"
      />
    </div>

    <!-- Data rows -->
    <div v-for="row in rows" :key="`row-${row}`" class="flex gap-2">
      <Skeleton
        v-for="col in columns"
        :key="`cell-${row}-${col}`"
        :width="`${100 / columns}%`"
        height="1.5rem"
        border-radius="0.5rem"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

interface Props {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

withDefaults(defineProps<Props>(), {
  columns: 4,
  rows: 3,
  showHeader: true,
});
</script>
