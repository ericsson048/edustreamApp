import type { Ionicons } from '@expo/vector-icons';

export type SessionStatus = 'SCHEDULED' | 'WAITING' | 'LIVE' | 'ENDED';

export interface StatusConfig {
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'warning' | 'error' | 'textMuted' | 'success';
  label: string;
}

export const STATUS_CONFIG: Record<SessionStatus, StatusConfig> = {
  SCHEDULED: { icon: 'calendar-outline', colorKey: 'warning', label: 'Scheduled' },
  WAITING: { icon: 'hourglass-outline', colorKey: 'warning', label: 'Waiting' },
  LIVE: { icon: 'radio-outline', colorKey: 'error', label: 'Live Now' },
  ENDED: { icon: 'checkmark-outline', colorKey: 'textMuted', label: 'Ended' },
};
