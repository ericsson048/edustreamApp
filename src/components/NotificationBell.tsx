import { TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell({ size = 22 }: { size?: number }) {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity onPress={() => router.push('/(tabs)/more/notifications')} style={{ position: 'relative', marginLeft: 12 }}>
      <Ionicons name="notifications-outline" size={size} color={colors.text} />
      {unreadCount > 0 && (
        <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#ef4444', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
          <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 14 }}>{unreadCount > 99 ? '99+' : unreadCount}</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}
