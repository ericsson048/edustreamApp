import { apiClient } from './apiClient';
import { buildWebSocketUrl } from './realtime';

export interface Conversation {
  id: string;
  name: string;
  is_group: boolean;
  latest_message?: {
    id: string;
    content: string;
    sender_name?: string;
    created_at: string;
  } | null;
}

export interface Message {
  id: string;
  conversation: string;
  sender_name?: string;
  content: string;
  created_at: string;
  is_read?: boolean;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const messagingService = {
  async listConversations(): Promise<Conversation[]> {
    const { data } = await apiClient.get<Paginated<Conversation>>('/conversations/');
    return data.results ?? [];
  },
  async listMessages(conversationId: string): Promise<Message[]> {
    const { data } = await apiClient.get<Paginated<Message>>(`/messages/?conversation=${conversationId}`);
    return data.results ?? [];
  },
  async sendMessage(conversation: string, content: string): Promise<Message> {
    const { data } = await apiClient.post<Message>('/messages/', { conversation, content });
    return data;
  },
  async markConversationRead(conversationId: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/mark_read/`);
  },
  async createConversationSocket(conversationId: string): Promise<WebSocket> {
    const url = await buildWebSocketUrl(`/ws/messages/${conversationId}/`);
    return new WebSocket(url);
  },
};
