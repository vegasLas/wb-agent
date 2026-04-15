import apiClient from '@/api/client';

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
