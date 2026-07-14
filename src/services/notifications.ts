import { apiClient } from './apiClient';

export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export const notificationService = {
  async list(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<Paginated<Notification>>('/notifications/', { params });
    return data;
  },
  async markRead(id: string) {
    await apiClient.patch(`/notifications/${id}/mark_read/`);
  },
  async markAllRead() {
    await apiClient.post('/notifications/mark_all_read/');
  },
  async unreadCount() {
    const { data } = await apiClient.get<{ count: number }>('/notifications/unread_count/');
    return data.count;
  },
};
