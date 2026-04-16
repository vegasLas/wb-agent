<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import Button from 'primevue/button';
import ChatMessage from './ChatMessage.vue';
import ChatToolSteps from './ChatToolSteps.vue';
import { normalizeToolName } from '@/utils/ai-labels';

const store = useAIChatStore();
const scrollContainer = ref<HTMLElement | null>(null);

const safeMessages = computed(() => (store.messages ?? []) as any[]);

const isLoading = computed(
  () => store.status === 'submitted' || store.status === 'streaming',
);
const hasError = computed(() => !!store.error);
const isEmpty = computed(() => safeMessages.value.length === 0);

// Extract any active tool steps from the last assistant message to show above the loading dots
const activeToolSteps = computed(() => {
  if (!isLoading.value) return [];
  const lastMsg = safeMessages.value[safeMessages.value.length - 1];
  if (!lastMsg || lastMsg.role !== 'assistant') return [];
  return (lastMsg.parts || [])
    .filter((p: any) => {
      return (
        p?.type === 'tool-invocation' ||
        p?.type === 'dynamic-tool' ||
        (typeof p?.type === 'string' && p.type.startsWith('tool-'))
      );
    })
    .map((p: any) => {
      if (p.type === 'tool-invocation') {
        return {
          toolName: normalizeToolName(p.toolInvocation?.toolName) || 'unknown',
          state: p.toolInvocation?.state || 'call',
        };
      }
      return {
        toolName: normalizeToolName(p.toolName || p.type) || 'unknown',
        state: 'call' as const,
      };
    });
});

watch(
  () => {
    const msgs = safeMessages.value;
    const last = msgs[msgs.length - 1];
    const text =
      last?.parts
        ?.filter((p: any) => p?.type === 'text')
        ?.map((p: any) => p?.text)
        ?.join('') ?? '';
    return {
      count: msgs.length,
      lastTextLength: text.length,
      lastText: text.slice(0, 80),
    };
  },
  () => {
    nextTick().then(() => {
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
      }
    });
  },
  { deep: true },
);

function handleRetry() {
  store.retry();
}

const suggestions = [
  'Создай автобронирование на завтра',
  'Покажи мои таймслоты',
  'Какие акции доступны?',
];

defineEmits<{
  send: [text: string];
}>();
</script>

<template>
  <div
    ref="scrollContainer"
    class="flex-1 overflow-y-auto space-y-4 px-2 py-2"
    @error.capture="
      (e: any) => console.error('[CHAT-DEBUG] container error:', e)
    "
  >
    <!-- Empty state -->
    <div
      v-if="isEmpty && !isLoading"
      class="h-full flex flex-col items-center justify-center text-center px-4"
    >
      <div
        class="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-4"
      >
        <i class="pi pi-sparkles text-2xl text-purple-600" />
      </div>
      <h3 class="text-lg font-semibold mb-2">
        Чем могу помочь?
      </h3>
      <p class="text-sm text-muted mb-6 max-w-xs">
        Задавайте вопросы про автобронирования, таймслоты, отчеты и акции.
      </p>
      <div class="space-y-2 w-full max-w-xs">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="w-full text-left px-4 py-2.5 rounded-xl border border-deep-border text-sm text-secondary hover:bg-elevated hover:border-purple-600/30 transition-all"
          @click="$emit('send', suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <!-- Messages -->
    <ChatMessage
      v-for="message in safeMessages"
      :key="message?.id ?? Math.random()"
      :message="message"
    />

    <!-- Loading indicator -->
    <div
      v-if="isLoading"
      class="flex justify-start"
    >
      <div
        class="bg-surface-200 dark:bg-surface-700 rounded-2xl rounded-bl-md p-3 flex flex-col gap-2 min-w-[120px]"
      >
        <ChatToolSteps
          v-if="activeToolSteps.length"
          :steps="activeToolSteps"
        />
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 bg-muted rounded-full animate-bounce"
            style="animation-delay: 0ms"
          />
          <span
            class="w-2 h-2 bg-muted rounded-full animate-bounce"
            style="animation-delay: 150ms"
          />
          <span
            class="w-2 h-2 bg-muted rounded-full animate-bounce"
            style="animation-delay: 300ms"
          />
          <span class="text-xs text-muted ml-1">AI думает…</span>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="hasError"
      class="flex justify-center"
    >
      <div
        class="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <span class="text-sm text-red-600 dark:text-red-400">
          Ошибка: {{ store.error?.message || 'Не удалось получить ответ' }}
        </span>
        <Button
          icon="pi pi-refresh"
          label="Повторить"
          severity="danger"
          variant="text"
          size="small"
          @click="handleRetry"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
