<template>
  <div :class="gridClass">
    <div
      v-for="i in count"
      :key="`stat-${i}`"
      class="p-4 bg-deep-card text-center rounded-lg"
    >
      <Skeleton
        :width="valueWidth"
        height="2rem"
        border-radius="0.5rem"
        class="mx-auto mb-2"
      />
      <Skeleton
        :width="labelWidth"
        height="0.875rem"
        border-radius="0.5rem"
        class="mx-auto"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Skeleton from 'primevue/skeleton';

interface Props {
  count?: number;
  colsMobile?: number;
  colsDesktop?: number;
  valueWidth?: string;
  labelWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  count: 4,
  colsMobile: 2,
  colsDesktop: 4,
  valueWidth: '4rem',
  labelWidth: '60%',
});

const gridClass = computed(() => {
  const mobile = `grid-cols-${props.colsMobile}`;
  const desktop = `md:grid-cols-${props.colsDesktop}`;
  return `grid ${mobile} ${desktop} gap-4`;
});
</script>
