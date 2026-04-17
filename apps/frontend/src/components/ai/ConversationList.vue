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

    <div class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      <div
        v-if="store.isLoadingConversations && sortedConversations.length === 0"
        class="space-y-2"
      >
        <div
          v-for="n in 5"
          :key="n"
          class="h-10 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"
        />
      </div>

      <div
        v-else-if="sortedConversations.length === 0"
        class="text-sm text-muted text-center py-4"
      >
        Нет чатов
      </div>

      <nav
        v-else
        class="space-y-1"
      >
        <button
          v-for="conv in sortedConversations"
          :key="conv.id"
          :class="[
            'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left',
            selectedId === conv.id
              ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-md shadow-purple-900/20'
              : 'text-secondary hover:text-theme hover:bg-elevated hover:translate-x-0.5',
          ]"
          @click="emit('select', conv.id)"
        >
          <i
            :class="[
              'pi pi-comments text-base transition-transform duration-200 shrink-0',
              selectedId === conv.id ? '' : 'group-hover:scale-110',
            ]"
          />
          <div class="min-w-0 flex-1">
            <div class="truncate">
              {{ conv.title || 'Новый чат' }}
            </div>
            <div
              :class="[
                'text-xs truncate',
                selectedId === conv.id ? 'text-white/80' : 'text-muted',
              ]"
            >
              {{ formatDate(conv.updatedAt) }}
            </div>
          </div>
          <Button
            icon="pi pi-trash"
            severity="danger"
            variant="text"
            class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            :class="selectedId === conv.id ? 'text-white/80 hover:text-white' : ''"
            @click="handleDelete(conv.id, $event)"
          />
        </button>
      </nav>
    </div>
  </div>
</template>
