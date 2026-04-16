<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import Button from 'primevue/button';
import Sidebar from 'primevue/sidebar';
import ConversationList from './ConversationList.vue';
import ChatMessageList from './ChatMessageList.vue';
import ChatInput from './ChatInput.vue';

const store = useAIChatStore();
const isOpen = ref(false);

function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    store.loadConversations();
  }
}

function handleSelect(id: string) {
  store.loadConversation(id);
}

function handleNew() {
  store.startNewConversation();
}

function handleSendFromSuggestion(text: string) {
  store.sendMessage(text);
}

// Cmd/Ctrl + K shortcut
function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    toggle();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50">
    <Button
      icon="pi pi-comments"
      rounded
      aria-label="Open AI Chat"
      @click="toggle"
    />
  </div>

  <Sidebar
    v-model:visible="isOpen"
    position="right"
    class="w-full md:w-[40rem]"
  >
    <div class="flex h-full">
      <!-- Chat area -->
      <div class="flex-1 flex flex-col h-full min-w-0">
        <div class="px-4 py-3 border-b border-deep-border flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <i class="pi pi-sparkles text-purple-600" />
            <h2 class="font-semibold">AI Assistant</h2>
          </div>
          <div class="flex items-center gap-2">
            <Button
              icon="pi pi-plus"
              severity="secondary"
              variant="text"
              size="small"
              label="Новый чат"
              @click="handleNew"
            />
            <Button
              icon="pi pi-times"
              severity="secondary"
              variant="text"
              size="small"
              aria-label="Закрыть"
              @click="isOpen = false"
            />
          </div>
        </div>

        <ChatMessageList @send="handleSendFromSuggestion" />
        <ChatInput />
      </div>

      <!-- Conversation list (hidden on very small screens inside panel) -->
      <div class="hidden sm:flex w-[260px] border-l border-deep-border flex-col">
        <ConversationList
          :selected-id="store.conversationId"
          @select="handleSelect"
          @new="handleNew"
        />
      </div>
    </div>
  </Sidebar>
</template>
