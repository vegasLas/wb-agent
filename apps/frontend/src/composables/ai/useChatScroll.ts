import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import type { UIMessage } from 'ai';

const BOTTOM_THRESHOLD = 100; // px

export function useChatScroll(messages: () => UIMessage[]) {
  const scrollContainer = ref<HTMLElement | null>(null);
  let userWasNearBottom = true;
  let scrollEl: HTMLElement | null = null;

  function isNearBottom(): boolean {
    if (!scrollEl) return true;
    return (
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight <=
      BOTTOM_THRESHOLD
    );
  }

  function scrollToBottom() {
    nextTick(() => {
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    });
  }

  function onScroll() {
    userWasNearBottom = isNearBottom();
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
    (newVal, oldVal) => {
      const isNewMessage = !oldVal || newVal.count !== oldVal.count;
      if (isNewMessage || userWasNearBottom) {
        scrollToBottom();
      }
    },
    { deep: true },
  );

  onMounted(() => {
    scrollEl = scrollContainer.value;
    scrollToBottom();
    scrollEl?.addEventListener('scroll', onScroll, { passive: true });
  });

  onUnmounted(() => {
    scrollEl?.removeEventListener('scroll', onScroll);
  });

  return { scrollContainer };
}

function getMessageText(message: UIMessage | undefined): string {
  if (!message || !message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p?.type === 'text')
    .map((p) => p.text)
    .join('');
}
