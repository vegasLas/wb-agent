<script setup lang="ts">
import { computed } from 'vue';
import ProgressSpinner from 'primevue/progressspinner';
import { getToolLabel, normalizeToolName } from '@/utils/ai-labels';

export interface ToolStep {
  toolName: string;
  state?: 'call' | 'result';
}

const props = defineProps<{
  steps: ToolStep[];
}>();

// Deduplicate by normalized tool name: keep the most advanced state (result beats call)
const uniqueSteps = computed<ToolStep[]>(() => {
  const map = new Map<string, ToolStep>();
  for (const step of props.steps) {
    const key = normalizeToolName(step.toolName);
    const existing = map.get(key);
    if (!existing || (existing.state !== 'result' && step.state === 'result')) {
      map.set(key, { ...step, toolName: key });
    }
  }
  return Array.from(map.values());
});
</script>

<template>
  <div class="flex flex-col gap-2 my-1">
    <div
      v-for="(step, idx) in uniqueSteps"
      :key="`${step.toolName}-${idx}`"
      class="flex items-center gap-2.5"
    >
      <div class="relative w-5 h-5 flex items-center justify-center shrink-0">
        <i
          v-if="step.state === 'result'"
          class="pi pi-check-circle text-green-500 text-sm"
        />
        <ProgressSpinner
          v-else
          class="!w-3.5 !h-3.5"
          stroke-width="8"
        />
      </div>
      <div
        class="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 text-xs font-medium text-secondary border border-deep-border flex items-center gap-1.5"
      >
        <i
          :class="getToolLabel(step.toolName).icon"
          class="text-muted"
        />
        <span>{{ getToolLabel(step.toolName).label }}</span>
      </div>
    </div>
  </div>
</template>
