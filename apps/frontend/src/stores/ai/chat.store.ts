import { defineStore } from 'pinia';
import { ref, computed, markRaw } from 'vue';
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';

function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export const useAIChatStore = defineStore('aiChat', () => {
  const conversationId = ref<string | undefined>(undefined);

  const transport = markRaw(
    new DefaultChatTransport<UIMessage>({
      api: '/v1/ai/chat',
      prepareSendMessagesRequest: async ({ id, messages }) => {
        return {
          body: {
            id: conversationId.value || id,
            messages: messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: getMessageContent(m),
            })),
          },
        };
      },
    }),
  );

  const chat = markRaw(
    new Chat<UIMessage>({
      transport,
    }),
  );

  function startNewConversation() {
    conversationId.value = undefined;
    chat.messages = [];
  }

  function setConversationId(id: string) {
    conversationId.value = id;
  }

  async function sendMessage(text: string) {
    await chat.sendMessage({ text });
  }

  async function stop() {
    await chat.stop();
  }

  return {
    conversationId,
    messages: computed(() => chat.messages),
    status: computed(() => chat.status),
    error: computed(() => chat.error),
    sendMessage,
    stop,
    startNewConversation,
    setConversationId,
  };
});
