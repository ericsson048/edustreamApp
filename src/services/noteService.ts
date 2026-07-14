import { apiClient } from './apiClient';

export interface Note {
  id: string;
  lesson: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const noteService = {
  async list(lessonId: string) {
    const { data } = await apiClient.get<Paginated<Note>>('/notes/', { params: { lesson: lessonId } });
    return data;
  },
  async create(payload: { lesson: string; content: string }) {
    const { data } = await apiClient.post<Note>('/notes/', payload);
    return data;
  },
  async update(id: string, payload: { content: string }) {
    const { data } = await apiClient.patch<Note>(`/notes/${id}/`, payload);
    return data;
  },
  async remove(id: string) {
    await apiClient.delete(`/notes/${id}/`);
  },
};
