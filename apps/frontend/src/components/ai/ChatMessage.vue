<script setup lang="ts">
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useMessageParts, type ProcessedPart } from '@/composables/ai/useMessageParts';
import { exportTable } from '@/utils/ai/table-export';
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
  if (part.type === 'file') return `file-${index}-${part.filename}`;
  return `tool-${index}-${part.toolInfo.toolName}-${part.toolInfo.state}`;
}

function getFileIcon(filename: string, mediaType: string): string {
  if (filename.match(/\.(xlsx|xls)$/i) || mediaType.includes('sheet')) return 'pi pi-file-excel text-green-600';
  if (filename.match(/\.pdf$/i) || mediaType.includes('pdf')) return 'pi pi-file-pdf text-red-500';
  return 'pi pi-file text-surface-500';
}

async function handleMarkdownClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const markdownEl = event.currentTarget as HTMLElement;

  const toggle = target.closest('.table-export-toggle');
  if (toggle) {
    const dropdown = toggle.closest('.table-export-dropdown');
    const isOpen = dropdown?.classList.contains('open');
    markdownEl.querySelectorAll('.table-export-dropdown.open').forEach((el) => el.classList.remove('open'));
    if (!isOpen) {
      dropdown?.classList.add('open');
    }
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const item = target.closest('.table-export-item') as HTMLButtonElement | null;
  if (item) {
    const format = item.dataset.format as 'csv' | 'xlsx' | undefined;
    if (!format) return;

    const wrapper = item.closest('.table-wrapper');
    const table = wrapper?.querySelector('table');
    if (!table) return;

    item.closest('.table-export-dropdown')?.classList.remove('open');

    event.preventDefault();
    event.stopPropagation();
    await exportTable(table as HTMLTableElement, format);
    return;
  }

  markdownEl.querySelectorAll('.table-export-dropdown.open').forEach((el) => el.classList.remove('open'));
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
        'max-w-[85%] min-w-0 p-3 rounded-2xl text-sm',
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
            @click="handleMarkdownClick"
          />
        </template>

        <div
          v-else-if="item.type === 'file'"
          class="flex items-center gap-1.5 bg-white/20 dark:bg-black/20 rounded-lg px-2 py-1 text-xs mt-1"
        >
          <i :class="getFileIcon(item.filename, item.mediaType)" />
          <span class="truncate max-w-[140px]">{{ item.filename }}</span>
        </div>

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

.assistant-markdown :deep(.table-wrapper) {
  max-width: 100%;
}

.assistant-markdown :deep(.table-scroll) {
  overflow-x: auto;
  max-width: 100%;
}

.assistant-markdown :deep(.table-actions) {
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.assistant-markdown :deep(.table-export-dropdown) {
  position: relative;
}

.assistant-markdown :deep(.table-export-toggle) {
  font-size: 0.65rem;
  line-height: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.8);
  color: #374151;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.assistant-markdown :deep(.table-export-toggle:hover) {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.3);
}

.assistant-markdown :deep(.table-export-menu) {
  display: none;
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  z-index: 10;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.25rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  min-width: 80px;
}

.assistant-markdown :deep(.table-export-dropdown.open .table-export-menu) {
  display: flex;
}

.assistant-markdown :deep(.table-export-item) {
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  border: none;
  background: transparent;
  color: #374151;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.assistant-markdown :deep(.table-export-item:hover) {
  background: rgba(0, 0, 0, 0.05);
}

.assistant-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.25rem 0 0.5rem;
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

.dark .assistant-markdown :deep(pre),
.dark .assistant-markdown :deep(code),
.dark .assistant-markdown :deep(th) {
  background: rgba(255, 255, 255, 0.08);
}
.dark .assistant-markdown :deep(th),
.dark .assistant-markdown :deep(td) {
  border-color: rgba(255, 255, 255, 0.12);
}
.dark .assistant-markdown :deep(blockquote) {
  border-left-color: rgba(255, 255, 255, 0.2);
}
.dark .assistant-markdown :deep(a) {
  color: #a78bfa;
}
.dark .assistant-markdown :deep(.table-export-toggle) {
  background: rgba(30, 30, 30, 0.8);
  color: #d1d5db;
  border-color: rgba(255, 255, 255, 0.15);
}
.dark .assistant-markdown :deep(.table-export-toggle:hover) {
  background: rgba(40, 40, 40, 1);
  border-color: rgba(255, 255, 255, 0.3);
}
.dark .assistant-markdown :deep(.table-export-menu) {
  background: #1f2937;
  border-color: rgba(255, 255, 255, 0.1);
}
.dark .assistant-markdown :deep(.table-export-item) {
  color: #d1d5db;
}
.dark .assistant-markdown :deep(.table-export-item:hover) {
  background: rgba(255, 255, 255, 0.08);
}
</style>
