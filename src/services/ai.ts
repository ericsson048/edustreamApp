import { apiClient } from './apiClient';

export interface TutorMessage {
  id: string;
  conversation: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface TutorConversation {
  id: string;
  title: string;
  course?: string;
  lesson?: string;
  created_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const aiService = {
  async listConversations(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<TutorConversation>>('/ai/tutor/conversations/', { params });
    return data;
  },
  async createConversation(payload: { title?: string; course?: string; lesson?: string }) {
    const { data } = await apiClient.post<TutorConversation>('/ai/tutor/conversations/', payload);
    return data;
  },
  async listMessages(conversationId: string) {
    const { data } = await apiClient.get<Paginated<TutorMessage>>('/ai/tutor/messages/', { params: { conversation: conversationId } });
    return data;
  },
  async askTutor(payload: { conversation: string; message: string; course?: string; lesson?: string }) {
    const { data } = await apiClient.post<TutorMessage>('/ai/tutor/chat/', payload);
    return data;
  },
};
