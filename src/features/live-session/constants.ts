import type { Ionicons } from '@expo/vector-icons';

export type SessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';

export interface StatusConfig {
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'warning' | 'error' | 'textMuted';
  label: string;
}

export const STATUS_CONFIG: Record<SessionStatus, StatusConfig> = {
  SCHEDULED: { icon: 'calendar-outline', colorKey: 'warning', label: 'Scheduled' },
  LIVE: { icon: 'radio-outline', colorKey: 'error', label: 'Live Now' },
  ENDED: { icon: 'checkmark-outline', colorKey: 'textMuted', label: 'Ended' },
};
