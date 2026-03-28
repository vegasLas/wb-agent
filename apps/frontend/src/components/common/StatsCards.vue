<template>
  <div class="flex gap-2">
    <Button
      v-for="stat in stats"
      :key="stat.status"
      :variant="selectedStatus === stat.status ? undefined : 'outlined'"
      :severity="selectedStatus === stat.status ? 'primary' : 'secondary'"
      class="flex-1 justify-between leading-none truncate"
      @click="emit('statusClick', stat.status)"
    >
      <span class="truncate">{{ stat.label }}</span>
      <Badge
        :value="stat.count"
        class="ml-2"
        :class="
          selectedStatus === stat.status
            ? 'bg-white/20 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        "
      />
    </Button>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Badge from 'primevue/badge';

interface StatItem {
  status: string;
  count: number;
  label: string;
}

interface Props {
  stats: StatItem[];
  selectedStatus: string;
}

defineProps<Props>();

const emit = defineEmits<{
  statusClick: [status: string];
}>();
</script>
