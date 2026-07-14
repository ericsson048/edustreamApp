import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { learningService, type Assignment, type Submission } from '../../../src/services/learning';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function AssignmentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        learningService.listAssignments(),
        learningService.listSubmissions(),
      ]);
      setAssignments(a.results ?? []);
      setSubmissions(s.results ?? []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  const onRefresh = () => { setRefreshing(true); fetch(); };

  const submittedIds = new Set(submissions.map((s) => s.assignment));
  const gradedIds = new Set(submissions.filter((s) => s.grade).map((s) => s.assignment));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Assignments</ThemedText>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height={90} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : assignments.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="document-text-outline" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md }}>No assignments yet.</ThemedText>
          </ThemedView>
        ) : (
          assignments.map((a) => {
            const isGraded = gradedIds.has(a.id);
            const isSubmitted = submittedIds.has(a.id);
            const statusIcon = isGraded ? 'checkmark-circle' as const : isSubmitted ? 'cloud-upload-outline' as const : 'time-outline' as const;
            const statusLabel = isGraded ? 'Graded' : isSubmitted ? 'Submitted' : 'Pending';
            const statusColor = isGraded ? colors.success : isSubmitted ? colors.info : colors.warning;
            return (
              <ThemedView key={a.id} variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginBottom: Spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="body" bold style={{ flex: 1 }}>{a.title}</ThemedText>
                  <View style={[styles.typeBadge, { backgroundColor: colors.primaryLight }]}>
                    <ThemedText variant="label" style={{ color: colors.primary }}>{a.type}</ThemedText>
                  </View>
                </View>
                {a.course_title && (
                  <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>{a.course_title}</ThemedText>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md }}>
                  <ThemedText variant="caption" color="muted">Due: {new Date(a.due_date).toLocaleDateString()}</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={statusIcon} size={14} color={statusColor} />
                    <ThemedText variant="caption" style={{ color: statusColor, marginLeft: 4 }}>{statusLabel}</ThemedText>
                  </View>
                </View>
                {!isSubmitted && (
                  <TouchableOpacity
                    onPress={() => router.push(`/assignments/${a.id}/submit`)}
                    style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: Spacing.md }]}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <ThemedText variant="label" bold style={{ color: '#fff', marginLeft: 4 }}>Submit</ThemedText>
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
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
});
