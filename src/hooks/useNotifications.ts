import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { notificationService, type Notification } from '../services/notifications';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<Notification[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [count, list] = await Promise.all([
        notificationService.unreadCount(),
        notificationService.list({ page: 1 }),
      ]);
      setUnreadCount(count);
      setRecent(list.results ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    await notificationService.markRead(id);
    setRecent((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setRecent((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return { unreadCount, recent, refresh, markRead, markAllRead };
}
