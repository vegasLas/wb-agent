<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useAIChatStore } from '@/stores/ai/chat.store';

const store = useAIChatStore();

const props = defineProps<{
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [id: string];
  new: [];
}>();

const sortedConversations = computed(() =>
  [...store.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ),
);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

async function handleDelete(id: string, event: Event) {
  event.stopPropagation();
  if (confirm('Удалить этот чат?')) {
    await store.deleteConversation(id);
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="p-3 border-b border-deep-border">
      <Button
        label="Новый чат"
        icon="pi pi-plus"
        severity="secondary"
        variant="outlined"
        class="w-full"
        @click="emit('new')"
      />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="store.isLoadingConversations && sortedConversations.length === 0"
        class="p-4 space-y-3"
      >
        <div
          v-for="n in 5"
          :key="n"
          class="h-10 bg-surface-100 dark:bg-surface-800 rounded animate-pulse"
        />
      </div>

      <div
        v-else-if="sortedConversations.length === 0"
        class="p-4 text-sm text-muted text-center"
      >
        Нет чатов
      </div>

      <div v-else>
        <button
          v-for="conv in sortedConversations"
          :key="conv.id"
          :class="[
            'w-full text-left px-3 py-2.5 border-b border-deep-border transition-colors group flex items-center justify-between',
            selectedId === conv.id
              ? 'bg-purple-600/10 dark:bg-purple-600/20'
              : 'hover:bg-surface-100 dark:hover:bg-surface-800',
          ]"
          @click="emit('select', conv.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate">
              {{ conv.title || 'Новый чат' }}
            </div>
            <div class="text-xs text-muted">
              {{ formatDate(conv.updatedAt) }}
            </div>
          </div>
          <Button
            icon="pi pi-trash"
            severity="danger"
            variant="text"
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            @click="handleDelete(conv.id, $event)"
          />
        </button>
      </div>
    </div>
  </div>
</template>
