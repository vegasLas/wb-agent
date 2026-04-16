<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps<{ message: any }>();

const textContent = computed(() => {
  return (props.message.parts || [])
    .filter((p: any) => p?.type === 'text')
    .map((p: any) => p.text)
    .join('');
});

function sanitizeAssistantText(text: string): string {
  // Strip UUIDs
  let cleaned = text.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    '',
  );
  // Strip "оригид: 12345" or "(оригид: 12345)" or "warehouseId: 12345"
  cleaned = cleaned.replace(
    /\(?\s*(оригид|warehouseId)\s*[:\-]?\s*\d+\s*\)?/gi,
    '',
  );
  // Fix inline lists: ensure a newline before bullet or numbered list items that follow text on the same line
  cleaned = cleaned.replace(/(:\s+)([-*]\s)/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([:?.!]\s+)(\d{1,2}[.\)]\s+\S)/g, '$1\n\n$2');
  // Clean up double spaces and stray punctuation left behind
  cleaned = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
  return cleaned;
}

const renderedHtml = computed(() => {
  if (!textContent.value) return '';
  const safeText =
    props.message.role === 'assistant' ? sanitizeAssistantText(textContent.value) : textContent.value;
  const parsed = marked.parse(safeText, {
    breaks: true,
    gfm: true,
  }) as string;
  return DOMPurify.sanitize(parsed);
});
</script>

<template>
  <div
    :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
  >
    <div
      :class="[
        'max-w-[85%] p-3 rounded-2xl text-sm',
        message.role === 'user'
          ? 'bg-purple-600 text-white rounded-br-md'
          : 'bg-surface-200 dark:bg-surface-700 rounded-bl-md',
      ]"
    >
      <!-- User message -->
      <template v-if="message.role === 'user'">
        <span class="whitespace-pre-wrap">{{ textContent }}</span>
      </template>

      <!-- Assistant message -->
      <template v-else>
        <div
          v-if="renderedHtml"
          class="assistant-markdown whitespace-normal"
          v-html="renderedHtml"
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

/* Dark mode adjustments via media query */
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
