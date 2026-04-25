<script setup lang="ts">
import { computed } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useChatScroll } from '@/composables/ai/useChatScroll';
import { useCommandFavorites } from '@/utils/ai-commands';
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

const { sortedCommands, isFavorite } = useCommandFavorites();
const favoriteCommands = computed(() =>
  sortedCommands.value.filter((cmd) => isFavorite(cmd.id)),
);

const { scrollContainer } = useChatScroll(() => safeMessages.value);
function handleRetry() {
  store.retry();
}

const emit = defineEmits<{
  send: [text: string];
}>();

function handleSelectCommand(prompt: string) {
  emit('send', prompt);
}
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
      <!-- Greeting -->
      <div
        class="w-16 h-16 rounded-2xl bg-purple/10 flex items-center justify-center mb-4"
      >
        <i class="pi pi-sparkles text-2xl text-purple" />
      </div>
      <h3 class="text-lg font-semibold text-theme mb-1">
        Чем могу помочь?
      </h3>
      <p class="text-sm text-muted mb-6 max-w-sm">
        Выберите команду из избранного или напишите свой вопрос
      </p>

      <!-- Favorite commands list -->
      <div
        v-if="favoriteCommands.length > 0"
        class="w-full max-w-sm bg-card border border-deep-border rounded-xl overflow-hidden"
      >
        <div class="flex flex-col max-h-[280px] overflow-y-auto">
          <div
            v-for="(cmd, index) in favoriteCommands"
            :key="cmd.id"
            class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-elevated transition-colors"
            :class="{ 'border-t border-deep-border': index > 0 }"
            @click="handleSelectCommand(cmd.prompt)"
          >
            <div
              class="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center shrink-0"
            >
              <i :class="[cmd.icon, 'text-sm text-purple']" />
            </div>
            <span class="text-sm text-theme flex-1 text-left">{{ cmd.label }}</span>
            <i class="pi pi-chevron-right text-xs text-secondary" />
          </div>
        </div>
      </div>

      <!-- No favorites hint -->
      <div
        v-else
        class="text-sm text-muted max-w-sm"
      >
        Добавьте часто используемые команды в избранное через кнопку
        <span class="inline-flex items-center mx-1">
          <i class="pi pi-sliders-h text-xs text-secondary" />
        </span>
        рядом с полем ввода
      </div>
    </div>

    <!-- Messages -->
    <ChatMessage
      v-for="(message, index) in safeMessages"
      :key="message.id ?? `msg-${index}`"
      :message="message"
    />

    <!-- Loading indicator -->
    <div v-if="isLoading" class="flex justify-start items-start gap-2">
      <div
        class="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0 mt-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-sparkles size-3.5 shrink-0 transition-colors text-amber-500 dark:text-amber-400 animate-pulse"
          aria-hidden="true"
        >
          <path
            d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
          />
          <path d="M20 2v4" />
          <path d="M22 4h-4" />
          <circle cx="4" cy="20" r="2" />
        </svg>
      </div>
      <div
        class="bg-surface-200 dark:bg-surface-700 rounded-2xl rounded-bl-md p-3 flex flex-col min-w-[120px]"
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

<style scoped></style>
