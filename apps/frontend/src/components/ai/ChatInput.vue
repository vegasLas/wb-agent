<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import Button from 'primevue/button';

const store = useAIChatStore();
const inputText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const isLoading = computed(() => store.status === 'submitted' || store.status === 'streaming');

async function handleSubmit() {
  if (!inputText.value.trim() || isLoading.value) return;
  const text = inputText.value.trim();
  inputText.value = '';
  adjustHeight();
  await store.sendMessage(text);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}

function adjustHeight() {
  nextTick(() => {
    const el = textareaRef.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  });
}
</script>

<template>
  <form class="flex items-end gap-2 p-2 border-t border-deep-border" @submit.prevent="handleSubmit">
    <textarea
      ref="textareaRef"
      v-model="inputText"
      rows="1"
      :disabled="isLoading"
      class="flex-1 min-h-[44px] max-h-[160px] bg-surface-100 dark:bg-surface-800 rounded-xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-purple-600/30 disabled:opacity-60"
      placeholder="Напишите задачу для ИИ..."
      @keydown="handleKeydown"
      @input="adjustHeight"
    />
    <Button
      v-if="isLoading"
      icon="pi pi-stop"
      severity="secondary"
      class="rounded-xl shrink-0"
      @click="store.stop"
    />
    <Button
      v-else
      icon="pi pi-send"
      type="submit"
      class="rounded-xl shrink-0"
      :disabled="!inputText.trim()"
    />
  </form>
</template>
