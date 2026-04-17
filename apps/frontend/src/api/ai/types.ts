export interface AIConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentMeta {
  name: string;
  type: string;
  extractedPreview?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  attachments?: AttachmentMeta[] | null;
  createdAt: string;
}

export interface AIConversationsResponse {
  conversations: AIConversation[];
}

export interface AIConversationMessagesResponse {
  conversation: AIConversation;
  messages: AIMessage[];
}
