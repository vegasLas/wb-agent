import { ref, watch, nextTick, onMounted } from 'vue';
import type { UIMessage } from 'ai';

export function useChatScroll(messages: () => UIMessage[]) {
  const scrollContainer = ref<HTMLElement | null>(null);

  function scrollToBottom() {
    nextTick(() => {
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
      }
    });
  }

  watch(
    () => {
      const msgs = messages();
      const last = msgs[msgs.length - 1];
      const text = getMessageText(last);
      return {
        count: msgs.length,
        lastTextLength: text.length,
        lastText: text.slice(0, 80),
      };
    },
    scrollToBottom,
    { deep: true },
  );

  onMounted(scrollToBottom);

  return { scrollContainer };
}

function getMessageText(message: UIMessage | undefined): string {
  if (!message || !message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p?.type === 'text')
    .map((p) => p.text)
    .join('');
}
