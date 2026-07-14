import { useNotificationObserver } from '../services/pushNotifications';

export function NotificationSetup() {
  useNotificationObserver();
  return null;
}
