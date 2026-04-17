<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue';
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

function getMessageText(message: any): string {
  if (!message) return '';
  return (message.parts || [])
    .filter((p: any) => p?.type === 'text')
    .map((p: any) => p?.text)
    .join('');
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/(?<!\*)\*(?!\*)/g, '');
}

function isChoiceMessage(text: string): boolean {
  const lower = text.toLowerCase();
  const indicators = [
    'выберите',
    'выбери',
    'какой',
    'какую',
    'какое',
    'какие',
    'хотите',
    'да или нет',
    'вариант',
    'option',
    'choose',
    'select',
    'pick',
    'which',
    'скажите номер',
    'номер варианта',
    'всё верно',
    'создаём',
    'правильный черновик',
    'подтвердите',
    'создать',
  ];
  return indicators.some((w) => lower.includes(w));
}

interface QuickReply {
  value: string; // text sent on click
  label: string; // text shown on chip
  isNumbered?: boolean;
}

// Extract quick-reply suggestions from the LAST choice block or confirmation pattern
const quickReplies = computed<QuickReply[]>(() => {
  if (isLoading.value) return [];
  const msgs = safeMessages.value;
  const lastMsg = msgs[msgs.length - 1];
  if (!lastMsg || lastMsg.role !== 'assistant') return [];

  const text = getMessageText(lastMsg);
  if (!isChoiceMessage(text)) return [];

  const lower = text.toLowerCase();

  // Confirmation patterns
  if (lower.includes('всё верно') || lower.includes('все верно') || lower.includes('создаём автобронирование') || lower.includes('создаем автобронирование')) {
    return [
      { value: 'Да, создаём', label: 'Да, создаём' },
      { value: 'Нет', label: 'Нет, изменить' },
    ];
  }
  if (lower.includes('это правильный черновик')) {
    return [
      { value: 'Да', label: 'Да' },
      { value: 'Нет', label: 'Нет' },
    ];
  }

  // Normalize so that inline numbered items like "text: 1. Option" are split onto new lines
  const normalizedText = text.replace(/([^\n])(\d+[.\)]\s+)/g, '$1\n$2');
  const lines = normalizedText.split('\n');

  // Find the last contiguous block of NUMBERED lines only (never bullets)
  const suggestions: QuickReply[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(/^\s*(\d+)[.\)]\s+(.+)$/);
    if (match) {
      const num = match[1];
      const label = stripMarkdown(match[2].trim());
      if (label.length > 0 && label.length < 120) {
        suggestions.unshift({ value: num, label, isNumbered: true });
      }
    } else if (suggestions.length > 0) {
      // Stop once we leave the last choice block
      break;
    }
  }

  // Hide chips if there is only 1 option or more than 6
  if (suggestions.length <= 1 || suggestions.length > 6) return [];
  return suggestions;
});

watch(
  () => {
    const msgs = safeMessages.value;
    const last = msgs[msgs.length - 1];
    const text = getMessageText(last);
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

onMounted(() => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
});

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
          @click="emit('send', suggestion)"
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

    <!-- Quick reply chips -->
    <div
      v-if="quickReplies.length && !isLoading"
      class="flex justify-start"
    >
      <div class="max-w-[85%] flex flex-wrap gap-2">
        <button
          v-for="(reply, idx) in quickReplies"
          :key="idx"
          class="px-3 py-1.5 rounded-full border border-purple-600/30 bg-purple-600/10 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-600/20 transition-colors"
          @click="handleQuickReply(reply)"
        >
          <template v-if="reply.isNumbered">
            {{ idx + 1 }}.
          </template>{{ reply.label }}
        </button>
      </div>
    </div>

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
