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
  type AttachmentMeta,
} from '@/api/ai';
import { getInitData } from '@/utils/telegram';
import { createToolTrackingStream } from '@/utils/ai/stream';

const AUTH_TOKEN_KEY = 'auth_access_token';

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
  attachments?: AttachmentMeta[] | null,
): UIMessage {
  const parts: any[] = [{ type: 'text', text: content }];
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      parts.push({
        type: 'file',
        mediaType: att.type,
        filename: att.name,
      });
    }
  }
  return {
    id,
    role: role === 'tool' ? 'assistant' : role,
    createdAt: new Date(),
    parts,
  } as unknown as UIMessage;
}

interface ChatSession {
  chat: Chat<UIMessage>;
  finishedToolCallIds: Set<string>;
}

interface ConversationIdRef {
  value: string | undefined;
}

function createChatSession(
  conversationIdRef: ConversationIdRef,
  apiPath: string,
): ChatSession {
  const finishedToolCallIds = new Set<string>();

  const transport = markRaw(
    new DefaultChatTransport<UIMessage>({
      api: apiPath,
      fetch: async (url, init) => {
        const response = await fetch(url, { ...init, cache: 'no-store' });
        if (!response.ok || !response.body) {
          return response;
        }

        const trackedStream = createToolTrackingStream(
          response.body,
          (toolCallId) => {
            finishedToolCallIds.add(toolCallId);
          },
        );

        return new Response(trackedStream, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      },
      prepareSendMessagesRequest: async ({ messages }) => {
        return {
          headers: getAuthHeaders(),
          body: {
            id: conversationIdRef.value,
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
        // The AI SDK surfaces stream errors here; the store's computed `error`
        // property (activeSession?.chat.error) will reflect this automatically.
      },
    }),
  );

  return { chat, finishedToolCallIds };
}

function isPendingId(id: string): boolean {
  return id.startsWith('__pending-');
}

let nextClientId = 0;
function generateClientId(): string {
  return `__pending-${++nextClientId}`;
}

export const useAIChatStore = defineStore('aiChat', () => {
  const conversationId = ref<string | undefined>(undefined);
  const conversations = ref<AIConversation[]>([]);
  const isLoadingConversations = ref(false);
  const isLoadingMessages = ref(false);
  const pendingConversations = ref<Map<string, AIConversation>>(new Map());

  const sessions = ref<Map<string, ChatSession>>(new Map());

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1';
  const chatApiPath =
    (apiBaseUrl.startsWith('http')
      ? new URL(apiBaseUrl).pathname
      : apiBaseUrl
    ).replace(/\/$/, '') + '/ai/chat';

  const activeSession = computed<ChatSession | undefined>(() => {
    if (!conversationId.value) return undefined;
    return sessions.value.get(conversationId.value);
  });

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

      let session = sessions.value.get(id);
      if (!session) {
        const idRef: ConversationIdRef = { value: conversation.id };
        session = createChatSession(idRef, chatApiPath);
        sessions.value.set(id, session);
      }
      session.chat.messages = messages.map((m) =>
        createUIMessageFromStored(m.id, m.role, m.content, m.attachments),
      );
      session.finishedToolCallIds.clear();
    } finally {
      isLoadingMessages.value = false;
    }
  }

  async function deleteConversation(id: string) {
    await apiDeleteConversation(id);
    conversations.value = conversations.value.filter((c) => c.id !== id);
    sessions.value.delete(id);
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
    const clientId = generateClientId();
    conversationId.value = clientId;
    const idRef: ConversationIdRef = { value: undefined };
    const session = createChatSession(idRef, chatApiPath);
    session.chat.messages = [];
    sessions.value.set(clientId, session);
  }

  function setConversationId(id: string) {
    conversationId.value = id;
  }

  async function sendMessage(text: string, files?: File[]) {
    let session = activeSession.value;
    if (!session) {
      startNewConversation();
      session = activeSession.value;
    }
    if (!session) {
      console.error('[CHAT-STORE] Failed to create chat session');
      return;
    }
    session.finishedToolCallIds.clear();

    // Show pending item in sidebar immediately for new conversations
    // OR bump existing conversation to top optimistically
    const currentId = conversationId.value;
    if (currentId && isPendingId(currentId)) {
      pendingConversations.value.set(currentId, {
        id: currentId,
        title: text.slice(0, 40) || 'Новый чат',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (currentId) {
      // Optimistically bump existing conversation to top
      const idx = conversations.value.findIndex((c) => c.id === currentId);
      if (idx !== -1) {
        conversations.value[idx] = {
          ...conversations.value[idx],
          updatedAt: new Date().toISOString(),
        };
      }
    }

    try {
      if (files && files.length > 0) {
        const dt = new DataTransfer();
        for (const file of files) {
          dt.items.add(file);
        }
        await session.chat.sendMessage({ text, files: dt.files });
      } else {
        await session.chat.sendMessage({ text });
      }
      console.log('[CHAT-STORE] sendMessage finished streaming');
    } catch (err) {
      console.error('[CHAT-STORE] sendMessage error:', err);
      throw err;
    }

    // After streaming finishes, refresh conversation list and migrate sessions
    await loadConversations();

    // Match newly created backend conversations to pending items
    const loaded = [...conversations.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    const pendingIds = [...pendingConversations.value.keys()];

    for (const pendingId of pendingIds) {
      // Find the most recent backend conversation that doesn't already have a session
      const unmatched = loaded.find(
        (c) => !sessions.value.has(c.id) && !isPendingId(c.id),
      );
      if (unmatched) {
        const pendingSession = sessions.value.get(pendingId);
        if (pendingSession) {
          sessions.value.set(unmatched.id, pendingSession);
          sessions.value.delete(pendingId);
        }
        pendingConversations.value.delete(pendingId);
        // If this was the active conversation, switch to the real ID
        if (conversationId.value === pendingId) {
          conversationId.value = unmatched.id;
        }
      }
    }

    // After migration, ensure all active sessions have the correct conversationId
    // by recreating them with a mutable ref pointing to the real ID.
    // This fixes the closure capture issue where the session's transport
    // still sends id: undefined after migration.
    const activeId = conversationId.value;
    if (activeId && !isPendingId(activeId)) {
      const existingSession = sessions.value.get(activeId);
      if (existingSession) {
        const idRef: ConversationIdRef = { value: activeId };
        const newSession = createChatSession(idRef, chatApiPath);
        newSession.chat.messages = existingSession.chat.messages;
        sessions.value.set(activeId, newSession);
      }
    }
  }

  async function stop() {
    await activeSession.value?.chat.stop();
  }

  async function retry() {
    const session = activeSession.value;
    if (!session) return;
    session.finishedToolCallIds.clear();
    const lastMessage = session.chat.messages[session.chat.messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      const text = getMessageContent(lastMessage);
      const lastUserIndex = session.chat.messages.findLastIndex(
        (m) => m.role === 'user',
      );
      if (lastUserIndex !== -1) {
        session.chat.messages = session.chat.messages.slice(0, lastUserIndex);
      }
      await sendMessage(text);
    }
  }

  return {
    conversationId,
    conversations: computed(() => conversations.value),
    messages: computed(() => {
      const msgs = activeSession.value?.chat.messages ?? [];
      if (!Array.isArray(msgs)) {
        console.error('[CHAT-STORE] chat.messages is not an array!', msgs);
        return [];
      }
      return msgs;
    }),
    status: computed(() => activeSession.value?.chat.status ?? 'ready'),
    error: computed(() => activeSession.value?.chat.error ?? undefined),
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
    pendingConversations: computed(() => pendingConversations.value),
    isToolFinished: (toolCallId: string) =>
      activeSession.value?.finishedToolCallIds.has(toolCallId) ?? false,
  };
});
