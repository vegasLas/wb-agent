<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner';
import { getToolLabel } from '@/utils/ai-labels';
import type { ToolPartInfo } from '@/composables/ai/useMessageParts';

interface Props {
  toolInfo: ToolPartInfo;
}

defineProps<Props>();
</script>

<template>
  <div
    class="my-2 flex items-center gap-2.5 tool-indicator"
    :class="{ 'is-done': toolInfo.state === 'result' }"
  >
    <div class="relative w-5 h-5 flex items-center justify-center shrink-0">
      <Transition name="tool-state" mode="out-in">
        <i
          v-if="toolInfo.state === 'result'"
          key="done"
          class="pi pi-check-circle text-green-500 text-sm"
        />
        <ProgressSpinner
          v-else
          key="pending"
          class="!w-3.5 !h-3.5"
          stroke-width="8"
        />
      </Transition>
    </div>
    <div
      class="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 text-xs font-medium text-secondary border border-deep-border flex items-center gap-1.5 transition-colors"
    >
      <i :class="getToolLabel(toolInfo.toolName).icon" class="text-muted" />
      <span>{{ getToolLabel(toolInfo.toolName).label }}</span>
    </div>
  </div>
</template>

<style scoped>
.tool-indicator.is-done .px-2 {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.08);
}

.tool-state-enter-active,
.tool-state-leave-active {
  transition: all 0.2s ease;
}

.tool-state-enter-from,
.tool-state-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
