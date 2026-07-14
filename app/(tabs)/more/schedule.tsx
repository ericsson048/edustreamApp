import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { scheduleService } from '../../../src/services/schedule';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

interface LiveSession {
  id: string;
  title: string;
  course_title?: string;
  instructor_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Schedule</ThemedText>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl }}
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
              <ThemedView key={s.id} variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginBottom: Spacing.md }}>
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
                  <TouchableOpacity
                    onPress={() => router.push(`/live/${s.id}`)}
                    style={[styles.joinBtn, { backgroundColor: colors.error, marginTop: Spacing.md }]}
                  >
                    <Ionicons name="enter-outline" size={16} color="#fff" />
                    <ThemedText variant="label" bold style={{ color: '#fff', marginLeft: 4 }}>Join</ThemedText>
                  </TouchableOpacity>
                )}
              </ThemedView>
            );
          })
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
  },
  backBtn: {
    marginBottom: Spacing.sm,
  },
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
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
});
