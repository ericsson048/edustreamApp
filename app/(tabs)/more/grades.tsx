import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { learningService, type Submission } from '../../../src/services/learning';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function GradesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await learningService.listSubmissions();
      setSubmissions(data.results ?? []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  const onRefresh = () => { setRefreshing(true); fetch(); };

  const graded = submissions.filter((s) => s.grade);
  const avg = graded.length
    ? (graded.reduce((sum, s) => sum + parseFloat(s.grade || '0'), 0) / graded.length).toFixed(1)
    : 'N/A';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Grades</ThemedText>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.xl }}>
          <ThemedText variant="h1" bold style={{ color: avg !== 'N/A' ? colors.success : colors.textMuted }}>{avg}</ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>Average Grade</ThemedText>
        </ThemedView>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height={80} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : submissions.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="bar-chart-outline" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md }}>No submissions yet.</ThemedText>
          </ThemedView>
        ) : (
          submissions.map((s) => (
            <ThemedView key={s.id} variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" bold>{s.assignment_title || 'Submission'}</ThemedText>
                  <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                    {s.status} · {new Date(s.submitted_at).toLocaleDateString()}
                  </ThemedText>
                </View>
                <View style={[styles.gradeBadge, { backgroundColor: s.grade ? colors.success + '20' : colors.warning + '20' }]}>
                  <ThemedText variant="h3" bold style={{ color: s.grade ? colors.success : colors.warning }}>
                    {s.grade ? `${s.grade}%` : '—'}
                  </ThemedText>
                </View>
              </View>
              {s.feedback ? (
                <ThemedView variant="secondary" rounded="lg" style={{ marginTop: Spacing.sm, padding: Spacing.md }}>
                  <ThemedText variant="caption" color="secondary">{s.feedback}</ThemedText>
                </ThemedView>
              ) : null}
            </ThemedView>
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
  gradeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
});
