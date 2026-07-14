import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { notificationService, type Notification } from '../../../src/services/notifications';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  COURSE_UPDATE: 'book-outline',
  ASSIGNMENT: 'document-text-outline',
  GRADE: 'bar-chart-outline',
  MESSAGE: 'chatbubble-outline',
  SKILL_UNLOCK: 'star-outline',
  SYSTEM: 'notifications-outline',
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await notificationService.list({ page: 1 });
      setItems(data.results ?? []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  const onRefresh = () => { setRefreshing(true); fetch(); };

  const markRead = async (n: Notification) => {
    if (n.is_read) return;
    await notificationService.markRead(n.id);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText variant="h2" bold style={{ marginLeft: Spacing.lg }}>Notifications</ThemedText>
        </View>
        {items.some((n) => !n.is_read) && (
          <TouchableOpacity
            onPress={async () => {
              await notificationService.markAllRead();
              setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
            }}
          >
            <ThemedText variant="caption" style={{ color: colors.primary }}>Mark all read</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonLoader key={i} height={80} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : items.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="notifications-off-outline" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md }}>No notifications yet.</ThemedText>
          </ThemedView>
        ) : (
          items.map((n) => (
            <TouchableOpacity
              key={n.id}
              onPress={() => markRead(n)}
              activeOpacity={0.7}
              style={{ marginBottom: Spacing.sm }}
            >
              <ThemedView
                variant="card"
                rounded="xl"
                elevated
                style={[styles.notifItem, n.is_read ? {} : { borderLeftWidth: 3, borderLeftColor: colors.primary }]}
              >
                <View style={[styles.notifIcon, { backgroundColor: n.is_read ? colors.surfaceSecondary : colors.primaryLight }]}>
                  <Ionicons
                    name={typeIcons[n.notification_type] || 'notifications-outline'}
                    size={22}
                    color={n.is_read ? colors.textMuted : colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText variant="body" bold={!n.is_read} style={{ flex: 1 }}>{n.title}</ThemedText>
                  <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>{n.body}</ThemedText>
                </View>
                {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              </ThemedView>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
});
