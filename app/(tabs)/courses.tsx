import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { PressScale } from '../../src/components/PressScale';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { CourseCard } from '../../src/components/CourseCard';
import { Header } from '../../src/components/Header';
import { useTheme } from '../../src/contexts/ThemeContext';
import { courseService, enrollmentService, type Enrollment } from '../../src/services/courses';
import { Spacing, BorderRadius } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { NotificationBell } from '../../src/components/NotificationBell';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';

const filters = ['All', 'In Progress', 'Completed'] as const;

export default function CoursesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const fetchData = useCallback(async () => {
    try {
      const data = await enrollmentService.listEnrollments({ is_active: true });
      const enrollments = data.results ?? [];
      setEnrollments(enrollments);

      const progressResults = await Promise.all(
        enrollments.map(e =>
          courseService.listProgress({ enrollment: e.id }).then(p => ({ enrollmentId: e.id, progress: p.results ?? [] })).catch(() => ({ enrollmentId: e.id, progress: [] }))
        )
      );
      const courseIds = [...new Set(enrollments.map(e => e.course))];
      const courses = await Promise.all(
        courseIds.map(id => courseService.getCourse(id).catch(() => null))
      );
      const lessonCountMap: Record<string, number> = {};
      courses.forEach(c => { if (c) lessonCountMap[c.id] = c.modules?.reduce((s, m) => s + (m.lessons?.length || 0), 0) ?? 0; });
      const tMap: Record<string, string | undefined> = {};
      courses.forEach(c => { if (c) tMap[c.id] = c.thumbnail; });
      setThumbnailMap(tMap);
      const map: Record<string, number> = {};
      progressResults.forEach(({ enrollmentId, progress }) => {
        const e = enrollments.find(en => en.id === enrollmentId);
        if (!e) return;
        const total = lessonCountMap[e.course] ?? 0;
        const completed = progress.filter(p => p.is_completed).length;
        if (total > 0) map[enrollmentId] = (completed / total) * 100;
      });
      setProgressMap(map);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = enrollments.filter((e) => {
    const pct = progressMap[e.id] ?? 0;
    if (activeFilter === 'In Progress') return pct > 0 && pct < 100;
    if (activeFilter === 'Completed') return pct >= 100;
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="My Courses"
        subtitle={`${enrollments.length} enrolled`}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PressScale onPress={() => router.push('/(tabs)/more/messages')} accessibilityLabel="Messages">
              <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
            </PressScale>
            <NotificationBell />
            <ThemeSwitcher />
            <LanguageSwitcher />
          </View>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {filters.map((f) => (
              <PressScale
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[
                  styles.filterChip,
                  { backgroundColor: activeFilter === f ? colors.primary : colors.surface },
                  activeFilter === f ? {} : { borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <ThemedText
                  variant="caption"
                  bold
                  style={{ color: activeFilter === f ? '#fff' : colors.textSecondary }}
                >
                  {f}
                </ThemedText>
              </PressScale>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} height={200} rounded="xl" style={{ marginBottom: Spacing.md }} />
          ))
        ) : filtered.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="book-outline" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
              {activeFilter === 'All' ? 'No courses yet.' : `No ${activeFilter.toLowerCase()} courses.`}
            </ThemedText>
          </ThemedView>
        ) : (
          filtered.map((e) => (
            <CourseCard
              key={e.id}
              title={e.course_title}
              instructor={e.instructor_name}
              thumbnail={e.thumbnail || thumbnailMap[e.course]}
              progress={progressMap[e.id]}
              onPress={() => router.push(`/course/${e.course}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
