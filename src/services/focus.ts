import { apiClient } from './apiClient';

export interface FocusSession {
  id: string;
  duration_seconds: number;
  mode: 'WORK' | 'BREAK';
  started_at: string;
}

export interface FocusStats {
  total_focus_minutes: number;
  total_sessions: number;
}

export const focusService = {
  async getStats() {
    const { data } = await apiClient.get<FocusStats>('/focus-sessions/stats/');
    return data;
  },
  async createSession(payload: { duration_seconds: number; mode: string }) {
    const { data } = await apiClient.post<FocusSession>('/focus-sessions/', payload);
    return data;
  },
};
