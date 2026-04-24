<template>
  <div class="flex gap-1">
    <Skeleton
      v-for="i in count"
      :key="`tab-${i}`"
      width="100%"
      height="2rem"
      border-radius="0.5rem"
    />
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

interface Props {
  count?: number;
}

withDefaults(defineProps<Props>(), {
  count: 2,
});
</script>
