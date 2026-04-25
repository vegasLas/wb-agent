<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useViewReady } from '@/composables/ui';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import ConversationList from '@/components/ai/ConversationList.vue';
import ChatMessageList from '@/components/ai/ChatMessageList.vue';
import ChatInput from '@/components/ai/ChatInput.vue';

const store = useAIChatStore();
const { viewReady } = useViewReady();
const historyDrawerVisible = ref(false);
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null);

onMounted(() => {
  store.loadConversations();
  viewReady();
});

function handleSelect(id: string) {
  store.loadConversation(id);
  historyDrawerVisible.value = false;
}

function handleNew() {
  store.startNewConversation();
  historyDrawerVisible.value = false;
}

function handleFillInput(text: string) {
  chatInputRef.value?.setInputText(text);
}
</script>

<template>
  <div class="h-[78vh] lg:h-[calc(100vh-100px)] flex gap-4">
    <!-- Chat area -->
    <div
      class="flex-1 h-[80vh] md:h-[90vh] bg-card border border-deep-border rounded-2xl flex flex-col overflow-hidden pb-1 max-w-[900px]"
    >
      <div
        class="px-4 py-3 border-b border-deep-border flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <i class="pi pi-sparkles text-purple-600" />
          <h1 class="font-semibold">AI Assistant</h1>
        </div>

        <!-- Mobile actions: new chat + history drawer -->
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
            @click="historyDrawerVisible = true"
          />
        </div>

        <!-- Desktop new chat -->
        <button
          class="hidden md:block text-sm text-purple-600 hover:text-purple-500 font-medium"
          @click="handleNew"
        >
          Новый чат
        </button>
      </div>

      <ChatMessageList @send="handleFillInput" />
      <ChatInput ref="chatInputRef" />
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

  <!-- Mobile history drawer -->
  <Drawer
    v-model:visible="historyDrawerVisible"
    position="right"
    :pt="{
      root: { class: 'w-[280px]' },
      content: { class: 'p-0' },
    }"
  >
    <ConversationList
      :selected-id="store.conversationId"
      @select="handleSelect"
      @new="handleNew"
    />
  </Drawer>
</template>
