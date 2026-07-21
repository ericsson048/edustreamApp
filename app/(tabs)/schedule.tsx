import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { PressScale } from '../../src/components/PressScale';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { scheduleService, type LiveSession } from '../../src/services/schedule';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { NotificationBell } from '../../src/components/NotificationBell';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';

export default function ScheduleTabScreen() {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await scheduleService.listSessions();
      setSessions(data.results ?? []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  const onRefresh = () => { setRefreshing(true); fetch(); };

  const statusConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    SCHEDULED: { icon: 'calendar-outline', color: colors.warning, label: 'Scheduled' },
    LIVE: { icon: 'radio-outline', color: colors.error, label: 'Live' },
    ENDED: { icon: 'checkmark-outline', color: colors.textMuted, label: 'Ended' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemedView variant="surface" style={{ paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <ThemedText variant="h1" bold>Schedule</ThemedText>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>Your upcoming live sessions</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PressScale onPress={() => router.push('/(tabs)/more/messages')} accessibilityLabel="Messages">
              <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
            </PressScale>
            <NotificationBell />
            <ThemeSwitcher />
            <LanguageSwitcher />
          </View>
        </View>
      </ThemedView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} height={100} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : sessions.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="calendar-outline" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md }}>No live sessions scheduled.</ThemedText>
          </ThemedView>
        ) : (
          sessions.map((s) => {
            const cfg = statusConfig[s.status] || statusConfig.SCHEDULED;
            return (
              <PressScale key={s.id} onPress={() => router.push(`/live/${s.id}`)} activeOpacity={0.7}>
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginBottom: Spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="body" bold>{s.title}</ThemedText>
                      {s.course_title && (
                        <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>{s.course_title}</ThemedText>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                      <ThemedText variant="label" style={{ color: cfg.color, marginLeft: 4 }}>{cfg.label}</ThemedText>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md }}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <ThemedText variant="caption" color="muted" style={{ marginLeft: 4 }}>
                      {new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes}min
                    </ThemedText>
                  </View>
                  {s.status === 'LIVE' && (
                    <View style={[styles.joinBadge, { backgroundColor: colors.error }]}>
                      <Ionicons name="radio" size={12} color="#fff" />
                      <ThemedText variant="label" bold style={{ color: '#fff', marginLeft: 4 }}>Join Now</ThemedText>
                    </View>
                  )}
                </ThemedView>
              </PressScale>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  joinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
});
