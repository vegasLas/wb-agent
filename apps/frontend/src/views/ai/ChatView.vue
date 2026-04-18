<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useViewReady } from '@/composables/ui';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menu';
import ConversationList from '@/components/ai/ConversationList.vue';
import ChatMessageList from '@/components/ai/ChatMessageList.vue';
import ChatInput from '@/components/ai/ChatInput.vue';

const store = useAIChatStore();
const { viewReady } = useViewReady();
const historyMenu = ref<InstanceType<typeof Menu> | null>(null);

onMounted(() => {
  store.loadConversations();
  viewReady();
});

function handleSelect(id: string) {
  store.loadConversation(id);
}

function handleNew() {
  store.startNewConversation();
}

function handleSendFromSuggestion(text: string) {
  store.sendMessage(text);
}

function openHistoryMenu(event: MouseEvent) {
  historyMenu.value?.toggle(event);
}

const historyMenuItems = computed<MenuItem[]>(() => {
  const list = [...store.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return [
    { separator: true },
    ...list.map((c) => ({
      label: c.title || 'Новый чат',
      icon: 'pi pi-comments',
      class:
        c.id === store.conversationId ? 'font-semibold text-purple-600' : '',
      command: () => handleSelect(c.id),
    })),
  ];
});
</script>

<template>
  <div class="h-[78vh] lg:h-[calc(100vh-100px)] flex gap-4">
    <!-- Chat area -->
    <div
      class="flex-1 h-full bg-card border border-deep-border rounded-2xl flex flex-col overflow-hidden pb-1 max-w-[900px]"
    >
      <div
        class="px-4 py-3 border-b border-deep-border flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <i class="pi pi-sparkles text-purple-600" />
          <h1 class="font-semibold">AI Assistant</h1>
        </div>

        <!-- Mobile actions: new chat + history menu -->
        <div class="flex items-center gap-2 md:hidden">
          <Button
            icon="pi pi-plus"
            label="Новый чат"
            size="small"
            severity="secondary"
            variant="outlined"
            @click="handleNew"
          />
          <Button
            icon="pi pi-history"
            label="История"
            size="small"
            severity="secondary"
            variant="outlined"
            @click="openHistoryMenu"
          />
          <Menu ref="historyMenu" :model="historyMenuItems" :popup="true" />
        </div>

        <!-- Desktop new chat -->
        <button
          class="hidden md:block text-sm text-purple-600 hover:text-purple-500 font-medium"
          @click="handleNew"
        >
          Новый чат
        </button>
      </div>

      <ChatMessageList @send="handleSendFromSuggestion" />
      <ChatInput />
    </div>

    <!-- Desktop conversation list -->
    <div
      class="hidden md:flex w-[260px] h-full bg-card border border-deep-border rounded-2xl flex-col overflow-hidden"
    >
      <ConversationList
        :selected-id="store.conversationId"
        @select="handleSelect"
        @new="handleNew"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.p-menuitem-link) {
  max-width: 16rem;
}
:deep(.p-menuitem-text) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
