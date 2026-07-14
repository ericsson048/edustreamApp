import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications() {
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
}

export function useNotificationObserver() {
  const isSetup = useRef(false);

  useEffect(() => {
    if (isSetup.current) return;
    isSetup.current = true;

    registerForPushNotifications();

    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      // notification received while app is foregrounded
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.link) {
        // Could navigate to the link
      }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);
}
