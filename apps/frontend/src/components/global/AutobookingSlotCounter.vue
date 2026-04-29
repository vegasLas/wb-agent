<template>
  <div class="slot-counter">
    <div class="flex items-center gap-2">
      <Tag
        :severity="severity"
        :value="label"
        class="text-xs"
      />
      <Button
        v-if="showUpsell"
        size="small"
        severity="warn"
        class="text-xs px-2 py-0.5"
        @click="goToStore"
      >
        Обновить
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Tag from 'primevue/tag';
import Button from 'primevue/button';

const props = defineProps<{
  used: number;
  max: number;
  label?: string;
}>();

const router = useRouter();

const percentage = computed(() => {
  if (props.max <= 0) return 0;
  return (props.used / props.max) * 100;
});

const severity = computed(() => {
  if (percentage.value >= 100) return 'danger';
  if (percentage.value >= 80) return 'warn';
  return 'success';
});

const label = computed(() => {
  return `${props.used}/${props.max} ${props.label || 'активных'}`;
});

const showUpsell = computed(() => percentage.value >= 90);

function goToStore() {
  router.push({ name: 'Payments' });
}
</script>
