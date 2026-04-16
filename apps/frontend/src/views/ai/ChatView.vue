<script setup lang="ts">
import { onMounted } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useViewReady } from '@/composables/ui';
import ConversationList from '@/components/ai/ConversationList.vue';
import ChatMessageList from '@/components/ai/ChatMessageList.vue';
import ChatInput from '@/components/ai/ChatInput.vue';

const store = useAIChatStore();
const { viewReady } = useViewReady();

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
</script>

<template>
  <div class="h-[calc(100vh-120px)] lg:h-[calc(100vh-100px)] flex gap-4">
    <!-- Chat area -->
    <div class="flex-1 h-full bg-card border border-deep-border rounded-2xl flex flex-col overflow-hidden">
      <div class="px-4 py-3 border-b border-deep-border flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-sparkles text-purple-600" />
          <h1 class="font-semibold">AI Assistant</h1>
        </div>
        <button
          class="text-sm text-purple-600 hover:text-purple-500 font-medium"
          @click="handleNew"
        >
          Новый чат
        </button>
      </div>

      <ChatMessageList @send="handleSendFromSuggestion" />
      <ChatInput />
    </div>

    <!-- Conversation list -->
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
