import { defineStore } from 'pinia';
import { ref, computed, markRaw } from 'vue';
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  fetchConversations,
  fetchConversationMessages,
  deleteConversation as apiDeleteConversation,
  updateConversationTitle as apiUpdateConversationTitle,
  type AIConversation,
} from '@/api/ai';
import { getInitData } from '@/utils/telegram';

const AUTH_TOKEN_KEY = 'auth_token';

function isTelegramMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__AUTH_MODE__ === 'telegram') return true;
  return getInitData() !== null;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const token = isTelegramMode()
    ? getInitData()
    : localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return {};

  return isTelegramMode()
    ? { 'x-init-data': token }
    : { Authorization: `Bearer ${token}` };
}

function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

function createUIMessageFromStored(
  id: string,
  role: 'user' | 'assistant' | 'tool',
  content: string,
): UIMessage {
  return {
    id,
    role: role === 'tool' ? 'assistant' : role,
    createdAt: new Date(),
    parts: [{ type: 'text', text: content }],
  } as unknown as UIMessage;
}

export const useAIChatStore = defineStore('aiChat', () => {
  const conversationId = ref<string | undefined>(undefined);
  const conversations = ref<AIConversation[]>([]);
  const isLoadingConversations = ref(false);
  const isLoadingMessages = ref(false);

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1';
  const chatApiPath =
    (apiBaseUrl.startsWith('http')
      ? new URL(apiBaseUrl).pathname
      : apiBaseUrl
    ).replace(/\/$/, '') + '/ai/chat';

  const transport = markRaw(
    new DefaultChatTransport<UIMessage>({
      api: chatApiPath,
      fetch: async (url, init) => {
        const response = await fetch(url, { ...init, cache: 'no-store' });
        if (!response.ok || !response.body) {
          return response;
        }
        // Wrap the response body to log every chunk as it arrives in the browser
        const reader = response.body.getReader();
        const loggedStream = new ReadableStream({
          start(controller) {
            function push() {
              reader
                .read()
                .then(({ done, value }) => {
                  if (done) {
                    controller.close();
                    return;
                  }
                  controller.enqueue(value);
                  push();
                })
                .catch((err) => {
                  controller.error(err);
                });
            }
            push();
          },
          cancel(reason) {
            return reader.cancel(reason);
          },
        });
        return new Response(loggedStream, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      },
      prepareSendMessagesRequest: async ({ id, messages }) => {
        return {
          headers: getAuthHeaders(),
          body: {
            id: conversationId.value,
            messages,
          },
        };
      },
    }),
  );

  const chat = markRaw(
    new Chat<UIMessage>({
      transport,
      experimental_throttle: 50,
      onError: (err) => {
        console.error('[CHAT-STORE] AI SDK error:', err);
      },
    }),
  );

  // Debug: log every message array change
  let lastMessagesDebug = JSON.stringify(chat.messages);
  setInterval(() => {
    const current = JSON.stringify(chat.messages);
    if (current !== lastMessagesDebug) {
      const msgs = chat.messages ?? [];
      const last = msgs[msgs.length - 1];
      console.log(
        '[CHAT-STORE] messages mutated. count:',
        msgs.length,
        'lastMessage role:',
        last?.role,
        'lastMessage parts count:',
        last?.parts?.length,
      );
      if (last?.parts?.length) {
        last.parts.forEach((p: any, i: number) => {
          console.log(
            `[CHAT-STORE]   part[${i}] type=${p?.type}, textLen=${p?.text?.length}`,
          );
        });
      }
      lastMessagesDebug = current;
    }
  }, 300);

  async function loadConversations() {
    isLoadingConversations.value = true;
    try {
      conversations.value = await fetchConversations(50, 0);
    } finally {
      isLoadingConversations.value = false;
    }
  }

  async function loadConversation(id: string) {
    isLoadingMessages.value = true;
    try {
      const { conversation, messages } = await fetchConversationMessages(id);
      conversationId.value = conversation.id;
      chat.messages = messages.map((m) =>
        createUIMessageFromStored(m.id, m.role, m.content),
      );
    } finally {
      isLoadingMessages.value = false;
    }
  }

  async function deleteConversation(id: string) {
    await apiDeleteConversation(id);
    conversations.value = conversations.value.filter((c) => c.id !== id);
    if (conversationId.value === id) {
      startNewConversation();
    }
  }

  async function updateTitle(id: string, title: string) {
    const updated = await apiUpdateConversationTitle(id, title);
    const idx = conversations.value.findIndex((c) => c.id === id);
    if (idx !== -1) {
      conversations.value[idx] = updated;
    }
  }

  function startNewConversation() {
    conversationId.value = undefined;
    chat.messages = [];
  }

  function setConversationId(id: string) {
    conversationId.value = id;
  }

  async function sendMessage(text: string) {
    console.log('[CHAT-STORE] sendMessage called:', text);
    try {
      await chat.sendMessage({ text });
      console.log('[CHAT-STORE] sendMessage finished streaming');
    } catch (err) {
      console.error('[CHAT-STORE] sendMessage error:', err);
      throw err;
    }
    // After sending, refresh conversation list so the title appears
    // Use a small delay to let the backend create the conversation
    setTimeout(() => {
      loadConversations().then(() => {
        if (!conversationId.value && conversations.value.length > 0) {
          const mostRecent = conversations.value[0];
          conversationId.value = mostRecent.id;
        }
      });
    }, 800);
  }

  async function stop() {
    await chat.stop();
  }

  async function retry() {
    // Retry the last message by re-sending it
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      const text = getMessageContent(lastMessage);
      // Remove the last user message and any assistant response after it
      const lastUserIndex = chat.messages.findLastIndex(
        (m) => m.role === 'user',
      );
      if (lastUserIndex !== -1) {
        chat.messages = chat.messages.slice(0, lastUserIndex);
      }
      await sendMessage(text);
    }
  }

  return {
    conversationId,
    conversations: computed(() => conversations.value),
    messages: computed(() => {
      const msgs = chat.messages ?? [];
      if (!Array.isArray(msgs)) {
        console.error('[CHAT-STORE] chat.messages is not an array!', msgs);
        return [];
      }
      return msgs;
    }),
    status: computed(() => chat.status),
    error: computed(() => chat.error),
    isLoadingConversations: computed(() => isLoadingConversations.value),
    isLoadingMessages: computed(() => isLoadingMessages.value),
    sendMessage,
    stop,
    retry,
    startNewConversation,
    setConversationId,
    loadConversations,
    loadConversation,
    deleteConversation,
    updateTitle,
  };
});
