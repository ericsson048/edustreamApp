import { apiClient } from './apiClient';

export interface LiveSession {
  id: string;
  course: string;
  title: string;
  course_title?: string;
  instructor_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const scheduleService = {
  async listSessions(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<LiveSession>>('/live-sessions/', { params });
    return data;
  },
  async getSession(id: string) {
    const { data } = await apiClient.get<LiveSession>(`/live-sessions/${id}/`);
    return data;
  },
  async joinSession(id: string) {
    const { data } = await apiClient.post<{ status: string }>(`/live-sessions/${id}/join/`);
    return data;
  },
  async createSession(payload: { course: string; title: string; scheduled_at: string; duration_minutes: number; status?: string }) {
    const { data } = await apiClient.post<LiveSession>('/live-sessions/', payload);
    return data;
  },
  async updateSession(id: string, payload: { title?: string; scheduled_at?: string; duration_minutes?: number; status?: string }) {
    const { data } = await apiClient.patch<LiveSession>(`/live-sessions/${id}/`, payload);
    return data;
  },
};
