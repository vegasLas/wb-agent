<script setup lang="ts">
import { computed } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useChatScroll } from '@/composables/ai/useChatScroll';
import { useQuickReplies, type QuickReply } from '@/composables/ai/useQuickReplies';
import Button from 'primevue/button';
import ChatMessage from './ChatMessage.vue';
import type { UIMessage } from 'ai';

const store = useAIChatStore();

const safeMessages = computed(() => (store.messages ?? []) as UIMessage[]);
const isLoading = computed(
  () => store.status === 'submitted' || store.status === 'streaming',
);
const hasError = computed(() => !!store.error);
const isEmpty = computed(() => safeMessages.value.length === 0);

const { scrollContainer } = useChatScroll(() => safeMessages.value);
const quickReplies = useQuickReplies(
  () => safeMessages.value,
  () => isLoading.value,
);

function handleRetry() {
  store.retry();
}

function handleQuickReply(reply: QuickReply) {
  emit('send', reply.value);
}

const suggestions = [
  'Создай автобронирование на завтра',
  'Покажи мои таймслоты',
  'Какие акции доступны?',
];

const emit = defineEmits<{
  send: [text: string];
}>();
</script>

<template>
  <div
    ref="scrollContainer"
    class="flex-1 overflow-y-auto space-y-4 px-2 py-2"
    @error.capture="
      (e: unknown) => console.error('[CHAT-DEBUG] container error:', e)
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
      <h3 class="text-lg font-semibold mb-2">Чем могу помочь?</h3>
      <p class="text-sm text-muted mb-6 max-w-xs">
        Задавайте вопросы про автобронирования, таймслоты, отчеты и акции.
      </p>
      <div class="space-y-2 w-full max-w-xs">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="w-full text-left px-4 py-2.5 rounded-xl border border-deep-border text-sm text-secondary hover:bg-elevated hover:border-purple-600/30 transition-all"
          @click="emit('send', suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <!-- Messages -->
    <ChatMessage
      v-for="(message, index) in safeMessages"
      :key="message.id ?? `msg-${index}`"
      :message="message"
    />

    <!-- Quick reply chips -->
    <div v-if="quickReplies.length && !isLoading" class="flex justify-start">
      <div class="max-w-[85%] flex flex-wrap gap-2">
        <button
          v-for="(reply, idx) in quickReplies"
          :key="reply.value + reply.label"
          class="px-3 py-1.5 rounded-full border border-purple-600/30 bg-purple-600/10 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-600/20 transition-colors"
          @click="handleQuickReply(reply)"
        >
          <template v-if="reply.isNumbered">{{ idx + 1 }}.</template>
          {{ reply.label }}
        </button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="flex justify-start items-start gap-2">
      <div
        class="w-8 h-8 rounded-full bg-purple-600/10 flex items-center justify-center shrink-0 mt-1"
      >
        <svg
          class="w-4 h-4 text-purple-600 sparkle-pulse"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
          />
        </svg>
      </div>
      <div
        class="bg-surface-200 dark:bg-surface-700 rounded-2xl rounded-bl-md p-3 flex flex-col gap-2 min-w-[120px]"
      >
        <span class="text-xs text-muted">думает…</span>
      </div>
    </div>

    <!-- Error -->
    <div v-if="hasError" class="flex justify-center">
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

<style scoped>
.sparkle-pulse {
  animation: sparkle-pulse 3s ease-in-out infinite;
}

@keyframes sparkle-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.9) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.1) rotate(12deg);
  }
}
</style>
