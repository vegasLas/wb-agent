import apiClient from '@/api/client';
import type {
  AIConversation,
  AIConversationsResponse,
  AIConversationMessagesResponse,
} from './types';

export async function fetchChatStream(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  conversationId?: string,
): Promise<Response> {
  const response = await apiClient.post('/ai/chat', {
    id: conversationId,
    messages,
  }, {
    responseType: 'stream',
    adapter: 'fetch',
  });
  return response.data as Response;
}

export async function fetchConversations(
  limit = 50,
  offset = 0,
): Promise<AIConversation[]> {
  const { data } = await apiClient.get<AIConversationsResponse>('/ai/conversations', {
    params: { limit, offset },
  });
  return data.conversations;
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<AIConversationMessagesResponse> {
  const { data } = await apiClient.get<AIConversationMessagesResponse>(
    `/ai/conversations/${conversationId}/messages`,
  );
  return data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/ai/conversations/${conversationId}`);
}

export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<AIConversation> {
  const { data } = await apiClient.patch<AIConversation>(
    `/ai/conversations/${conversationId}/title`,
    { title },
  );
  return data;
}
