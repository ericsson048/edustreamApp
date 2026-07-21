import { apiClient } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  title?: string;
  date_joined?: string;
}

export const authService = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<{ access: string; refresh: string }>('/auth/login/', { email, password });
    return data;
  },
  async register(payload: { email: string; full_name: string; role: string; password: string }) {
    await apiClient.post('/auth/register/', payload);
  },
  async getMe() {
    const { data } = await apiClient.get<AuthUser>('/auth/me/');
    return data;
  },
  async updateMe(payload: Partial<AuthUser>) {
    const { data } = await apiClient.patch<AuthUser>('/auth/me/', payload);
    return data;
  },
  async forgotPassword(email: string) {
    await apiClient.post('/auth/forgot-password/', { email });
  },
  async changePassword(payload: { old_password: string; new_password: string }) {
    await apiClient.post('/auth/change-password/', payload);
  },
};
