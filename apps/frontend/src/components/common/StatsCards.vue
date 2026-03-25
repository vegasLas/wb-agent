<template>
  <div class="flex gap-2 flex-wrap">
    <BaseButton
      v-for="stat in stats"
      :key="stat.status"
      :variant="selectedStatus === stat.status ? 'solid' : 'soft'"
      :color="selectedStatus === stat.status ? 'primary' : 'gray'"
      class="flex-1 justify-between min-w-fit"
      @click="emit('statusClick', stat.status)"
    >
      <span class="truncate">{{ stat.label }}</span>
      <span
        class="ml-2 px-2 py-0.5 text-xs rounded-full"
        :class="selectedStatus === stat.status 
          ? 'bg-white/20 text-white' 
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
      >
        {{ stat.count }}
      </span>
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
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
