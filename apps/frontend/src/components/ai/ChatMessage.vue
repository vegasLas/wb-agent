<script setup lang="ts">
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useMessageParts, type ProcessedPart } from '@/composables/ai/useMessageParts';
import ChatToolIndicator from './ChatToolIndicator.vue';
import type { UIMessage } from 'ai';

type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

interface MessageWithParts {
  role: MessageRole;
  parts?: unknown[];
}

const props = defineProps<{ message: MessageWithParts | UIMessage }>();

const store = useAIChatStore();
const processedParts = useMessageParts(
  () => props.message as MessageWithParts | UIMessage,
  store.isToolFinished,
);

function partKey(part: ProcessedPart, index: number): string {
  if (part.type === 'text') return `text-${index}-${part.text.slice(0, 20)}`;
  return `tool-${index}-${part.toolInfo.toolName}-${part.toolInfo.state}`;
}
</script>

<template>
  <div
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
      <template
        v-for="(item, idx) in processedParts"
        :key="partKey(item, idx)"
      >
        <template v-if="item.type === 'text'">
          <span
            v-if="message.role === 'user'"
            class="whitespace-pre-wrap"
          >{{ item.text }}</span>
          <div
            v-else
            class="assistant-markdown whitespace-normal"
            v-html="item.html"
          />
        </template>

        <ChatToolIndicator
          v-else-if="item.type === 'tool'"
          :tool-info="item.toolInfo"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.assistant-markdown :deep(h1),
.assistant-markdown :deep(h2),
.assistant-markdown :deep(h3),
.assistant-markdown :deep(h4) {
  font-weight: 600;
  margin: 0.75rem 0 0.25rem;
}

.assistant-markdown :deep(p) {
  margin: 0.25rem 0;
}

.assistant-markdown :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}

.assistant-markdown :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}

.assistant-markdown :deep(li) {
  margin: 0.125rem 0;
}

.assistant-markdown :deep(strong) {
  font-weight: 600;
}

.assistant-markdown :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  font-size: 0.75rem;
}

.assistant-markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.assistant-markdown :deep(a) {
  color: #7c3aed;
  text-decoration: underline;
}

.assistant-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
  font-size: 0.75rem;
}

.assistant-markdown :deep(th),
.assistant-markdown :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.375rem 0.5rem;
  text-align: left;
}

.assistant-markdown :deep(th) {
  background: rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

.assistant-markdown :deep(blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.15);
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

@media (prefers-color-scheme: dark) {
  .assistant-markdown :deep(pre),
  .assistant-markdown :deep(code),
  .assistant-markdown :deep(th) {
    background: rgba(255, 255, 255, 0.08);
  }
  .assistant-markdown :deep(th),
  .assistant-markdown :deep(td) {
    border-color: rgba(255, 255, 255, 0.12);
  }
  .assistant-markdown :deep(blockquote) {
    border-left-color: rgba(255, 255, 255, 0.2);
  }
  .assistant-markdown :deep(a) {
    color: #a78bfa;
  }
}
</style>
