import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';

export async function registerForPushNotifications() {
  try {
    const Notifications = await import('expo-notifications');
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = (existing as any).status;
    if (finalStatus !== 'granted') {
      const result = await Notifications.requestPermissionsAsync();
      finalStatus = (result as any).status;
    }
    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    try {
      await apiClient.post('/notifications/register_push/', { token, platform: Platform.OS });
    } catch {}

    return token;
  } catch {
    return null;
  }
}

export function useNotificationObserver() {
  const isSetup = useRef(false);

  useEffect(() => {
    if (isSetup.current) return;
    isSetup.current = true;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        registerForPushNotifications();

        const sub1 = Notifications.addNotificationReceivedListener(() => {});
        const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          const link = typeof data?.link === 'string' ? data.link : null;
          if (link) {
            import('expo-router').then(({ router }) => {
              router.push(link as any);
            }).catch(() => {});
          }
        });

        return () => {
          sub1.remove();
          sub2.remove();
        };
      } catch {}
    })();
  }, []);
}
