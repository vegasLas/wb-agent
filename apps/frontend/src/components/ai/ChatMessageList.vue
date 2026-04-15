<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import Button from 'primevue/button';

const store = useAIChatStore();
const scrollContainer = ref<HTMLElement | null>(null);

const isLoading = computed(() => store.status === 'submitted' || store.status === 'streaming');
const hasError = computed(() => !!store.error);
const isEmpty = computed(() => store.messages.length === 0);

watch(
  () => store.messages.length,
  async () => {
    await nextTick();
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  },
);

watch(
  () => store.status,
  async () => {
    await nextTick();
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  },
);

function handleRetry() {
  store.retry();
}

const suggestions = [
  'Создай автобронирование на завтра',
  'Покажи мои таймслоты',
  'Какие акции доступны?',
];
</script>

<template>
  <div
    ref="scrollContainer"
    class="flex-1 overflow-y-auto space-y-4 px-2 py-2"
  >
    <!-- Empty state -->
    <div v-if="isEmpty && !isLoading" class="h-full flex flex-col items-center justify-center text-center px-4">
      <div class="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-4">
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
          @click="$emit('send', suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div
      v-for="message in store.messages"
      :key="message.id"
      :class="[
        'flex',
        message.role === 'user' ? 'justify-end' : 'justify-start',
      ]"
    >
      <div
        :class="[
          'max-w-[85%] p-3 rounded-2xl text-sm',
          message.role === 'user'
            ? 'bg-purple-600 text-white rounded-br-md'
            : 'bg-surface-200 dark:bg-surface-700 rounded-bl-md',
        ]"
      >
        <template v-for="(part, idx) in message.parts" :key="idx">
          <span v-if="part.type === 'text'" class="whitespace-pre-wrap">{{ part.text }}</span>
          <span v-else-if="part.type === 'reasoning'" class="italic opacity-75 block">
            {{ part.text }}
          </span>
          <div
            v-else-if="part.type === 'tool-invocation' || (typeof part.type === 'string' && part.type.startsWith('tool-'))"
            class="text-xs border-l-2 border-purple-400 pl-2 py-1 opacity-90"
          >
            🔧 {{ 'toolInvocation' in part ? part.toolInvocation.toolName : part.type }}
          </div>
          <div
            v-else-if="part.type === 'dynamic-tool' || (typeof part.type === 'string' && part.type.startsWith('dynamic-tool'))"
            class="text-xs border-l-2 border-purple-400 pl-2 py-1 opacity-90"
          >
            🔧 {{ 'toolName' in part ? part.toolName : part.type }}
          </div>
        </template>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="flex justify-start">
      <div class="bg-surface-200 dark:bg-surface-700 rounded-2xl rounded-bl-md p-3 flex items-center gap-2">
        <span class="w-2 h-2 bg-muted rounded-full animate-bounce" style="animation-delay: 0ms" />
        <span class="w-2 h-2 bg-muted rounded-full animate-bounce" style="animation-delay: 150ms" />
        <span class="w-2 h-2 bg-muted rounded-full animate-bounce" style="animation-delay: 300ms" />
      </div>
    </div>

    <!-- Error -->
    <div v-if="hasError" class="flex justify-center">
      <div class="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
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
