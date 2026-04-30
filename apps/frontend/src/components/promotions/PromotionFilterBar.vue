<template>
  <!-- Desktop Filter Buttons -->
  <div class="hidden sm:flex items-center gap-2">
    <Button
      v-for="tab in tabs"
      :key="tab.value"
      :severity="currentFilter === tab.value ? 'primary' : 'secondary'"
      :text="currentFilter !== tab.value"
      size="small"
      @click="$emit('set-filter', tab.value)"
    >
      <span>{{ tab.label }}</span>
      <span
        class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
        :class="
          currentFilter === tab.value
            ? 'bg-white/20 text-white'
            : 'bg-black/10 dark:bg-white/10 text-theme'
        "
      >
        {{ counts[tab.value] }}
      </span>
    </Button>
  </div>

  <!-- Mobile Filter Buttons -->
  <div
    class="sm:hidden flex items-center justify-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-card"
  >
    <OverlayBadge
      v-for="tab in tabs"
      :key="tab.value"
      :value="counts[tab.value]"
      :severity="currentFilter === tab.value ? 'primary' : 'secondary'"
      size="small"
    >
      <Button
        :severity="currentFilter === tab.value ? 'primary' : 'secondary'"
        :text="currentFilter !== tab.value"
        size="small"
        :label="tab.label"
        class="text-xs"
        @click="$emit('set-filter', tab.value)"
      />
    </OverlayBadge>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import OverlayBadge from 'primevue/overlaybadge';
import type { PromotionFilter } from '@/types';

export interface FilterTab {
  label: string;
  value: PromotionFilter;
}

interface Props {
  tabs: FilterTab[];
  currentFilter: PromotionFilter;
  counts: Record<PromotionFilter, number>;
}

defineProps<Props>();

defineEmits<{
  'set-filter': [filter: PromotionFilter];
}>();
</script>
