export interface AIConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
}

export interface AIConversationsResponse {
  conversations: AIConversation[];
}

export interface AIConversationMessagesResponse {
  conversation: AIConversation;
  messages: AIMessage[];
}
