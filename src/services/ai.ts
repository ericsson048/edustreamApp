import { apiClient } from './apiClient';

export interface ConversationItem {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface TutorMessageItem {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
  conversation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  created_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const aiService = {
  async listConversations(): Promise<ConversationItem[]> {
    const { data } = await apiClient.get<Paginated<ConversationItem>>('/ai/tutor/conversations/');
    return data.results ?? [];
  },
  async createConversation(title?: string): Promise<ConversationItem> {
    const { data } = await apiClient.post<ConversationItem>('/ai/tutor/conversations/', { title: title || 'AI Tutor' });
    return data;
  },
  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/ai/tutor/conversations/${id}/`);
  },
  async listMessages(conversationId: string): Promise<TutorMessageItem[]> {
    const { data } = await apiClient.get<Paginated<TutorMessageItem>>(`/ai/tutor/messages/?conversation=${conversationId}`);
    return data.results ?? [];
  },
  async askTutor(prompt: string, conversation_id?: string, history?: { role: string; content: string }[]): Promise<{ response: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
    const { data } = await apiClient.post<{ response: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }>('/ai/tutor/chat/', { prompt, conversation_id, history });
    return data;
  },
};
