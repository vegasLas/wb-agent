<script setup lang="ts">
import { useAIChatStore } from '@/stores/ai/chat.store';
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Sidebar from 'primevue/sidebar';
import InputText from 'primevue/inputtext';

const store = useAIChatStore();
const isOpen = ref(false);
const inputText = ref('');

const isLoading = computed(() => store.status === 'submitted' || store.status === 'streaming');

function toggle() {
  isOpen.value = !isOpen.value;
}

async function handleSubmit() {
  if (!inputText.value.trim() || isLoading.value) return;
  const text = inputText.value;
  inputText.value = '';
  await store.sendMessage(text);
}

// Cmd/Ctrl + K shortcut
function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    toggle();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeyDown);
}
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

  <Sidebar v-model:visible="isOpen" position="right" class="w-full md:w-[30rem]">
    <div class="flex flex-col h-full">
      <h2 class="text-lg font-semibold mb-4">AI Assistant</h2>

      <div class="flex-1 overflow-y-auto space-y-4 px-2">
        <div
          v-for="message in store.messages"
          :key="message.id"
          :class="[
            'p-3 rounded-lg max-w-[85%]',
            message.role === 'user'
              ? 'bg-primary text-white ml-auto'
              : 'bg-surface-200 dark:bg-surface-700'
          ]"
        >
          <template v-for="(part, idx) in message.parts" :key="idx">
            <span v-if="part.type === 'text'">{{ part.text }}</span>
            <span v-else-if="part.type === 'reasoning'" class="italic opacity-75">
              {{ part.text }}
            </span>
            <div
              v-else-if="part.type === 'dynamic-tool' || (typeof part.type === 'string' && part.type.startsWith('tool-'))"
              class="text-sm border-l-2 pl-2"
            >
              🔧 {{ 'toolName' in part ? part.toolName : part.type }}
            </div>
          </template>
        </div>
      </div>

      <form class="mt-4 flex gap-2" @submit.prevent="handleSubmit">
        <InputText
          v-model="inputText"
          class="flex-1"
          placeholder="Напишите задачу для ИИ..."
          :disabled="isLoading"
        />
        <Button
          v-if="isLoading"
          icon="pi pi-stop"
          severity="secondary"
          @click="store.stop"
        />
        <Button v-else type="submit" icon="pi pi-send" />
      </form>
    </div>
  </Sidebar>
</template>
