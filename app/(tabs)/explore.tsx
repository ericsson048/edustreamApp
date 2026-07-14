import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { courseService, type Course } from '../../src/services/courses';
import { Spacing, BorderRadius } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher';
import { NotificationBell } from '../../src/components/NotificationBell';

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { is_published: true };
      if (selectedLevel) params.level = selectedLevel;
      if (search.trim()) params.search = search.trim();
      const data = await courseService.listCourses(params);
      setCourses(data.results ?? []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLevel, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemedView variant="surface" style={{ paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <ThemedText variant="h1" bold>Explore</ThemedText>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>Discover new courses</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/more/messages')} accessibilityLabel="Messages">
              <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <NotificationBell />
            <LanguageSwitcher />
          </View>
        </View>
        <ThemedView variant="secondary" rounded="xl" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Search courses..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </ThemedView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <TouchableOpacity
              onPress={() => setSelectedLevel(null)}
              style={[styles.chip, { backgroundColor: !selectedLevel ? colors.primary : colors.surface }, !selectedLevel ? {} : { borderWidth: 1, borderColor: colors.border }]}
            >
              <ThemedText variant="caption" bold style={{ color: !selectedLevel ? '#fff' : colors.textSecondary }}>All</ThemedText>
            </TouchableOpacity>
            {levels.map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setSelectedLevel(selectedLevel === l ? null : l)}
                style={[styles.chip, { backgroundColor: selectedLevel === l ? colors.primary : colors.surface }, selectedLevel === l ? {} : { borderWidth: 1, borderColor: colors.border }]}
              >
                <ThemedText variant="caption" bold style={{ color: selectedLevel === l ? '#fff' : colors.textSecondary }}>{l}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ThemedView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height={220} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : courses.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="compass-outline" size={40} color={colors.primary} />
            </View>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
              {search ? 'No courses match your search.' : 'No courses available yet.'}
            </ThemedText>
          </ThemedView>
        ) : (
          courses.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => router.push(`/course/${c.id}`)} activeOpacity={0.7} style={{ marginBottom: Spacing.md }}>
              <ThemedView variant="card" rounded="xl" elevated style={{ overflow: 'hidden' }}>
                {c.thumbnail ? (
                  <Image source={{ uri: c.thumbnail }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="library-outline" size={36} color={colors.primary} />
                  </View>
                )}
                <View style={{ padding: Spacing.lg }}>
                  <ThemedText variant="body" bold numberOfLines={2}>{c.title}</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs }}>
                    <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                    <ThemedText variant="caption" color="secondary" style={{ marginLeft: 4 }}>{c.instructor_name || 'Instructor'}</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm, flex: 1, flexWrap: 'wrap' }}>
                      {c.category && (
                        <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                          <ThemedText variant="label" style={{ color: colors.primary }}>{c.category}</ThemedText>
                        </View>
                      )}
                      <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
                        <Ionicons name="stats-chart-outline" size={10} color={colors.textMuted} />
                        <ThemedText variant="label" color="secondary" style={{ marginLeft: 4 }}>{c.level}</ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {c.average_rating ? (
                        <>
                          <Ionicons name="star" size={14} color={colors.warning} />
                          <ThemedText variant="caption" style={{ color: colors.warning, marginLeft: 2 }}>{c.average_rating.toFixed(1)}</ThemedText>
                        </>
                      ) : null}
                      {c.enrollments_count !== undefined && (
                        <ThemedText variant="caption" color="muted" style={{ marginLeft: 8 }}>
                          <Ionicons name="people-outline" size={12} /> {c.enrollments_count}
                        </ThemedText>
                      )}
                      {c.estimated_hours ? (
                        <ThemedText variant="caption" color="muted" style={{ marginLeft: 8 }}>
                          <Ionicons name="time-outline" size={12} /> {c.estimated_hours}h
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText variant="body" bold style={{ color: colors.success }}>
                      ${parseFloat(c.price || '0').toFixed(0)}
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    height: 44,
    fontSize: 15,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: 140,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
});
