import { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import { PressScale } from "../../src/components/PressScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedText } from "../../src/components/ThemedText";
import { ThemedView } from "../../src/components/ThemedView";
import { StatsCard } from "../../src/components/StatsCard";
import { CourseCard } from "../../src/components/CourseCard";
import { Header } from "../../src/components/Header";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  learningService,
  type UserStats,
  type RecommendedCourse,
  type Activity,
} from "../../src/services/learning";
import {
  courseService,
  enrollmentService,
  type Enrollment,
} from "../../src/services/courses";
import { Spacing, BorderRadius } from "../../src/theme/colors";
import { SkeletonLoader } from "../../src/components/SkeletonLoader";
import { LanguageSwitcher } from "../../src/components/LanguageSwitcher";
import { NotificationBell } from "../../src/components/NotificationBell";
import { ThemeSwitcher } from "../../src/components/ThemeSwitcher";
import { FadeIn } from "../../src/components/FadeIn";

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [recommended, setRecommended] = useState<RecommendedCourse[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, enrollData, recData] = await Promise.all([
        learningService.getStats(),
        enrollmentService.listEnrollments({ is_active: true }),
        learningService.getRecommendedCourses(),
      ]);
      const enrollments = enrollData.results ?? [];
      setStats(statsData);
      setEnrollments(enrollments);
      setRecommended(recData);

      const progressResults = await Promise.all(
        enrollments.map((e) =>
          courseService
            .listProgress({ enrollment: e.id })
            .then((p) => ({ enrollmentId: e.id, progress: p.results ?? [] }))
            .catch(() => ({ enrollmentId: e.id, progress: [] })),
        ),
      );
      const courseIds = [...new Set(enrollments.map((e) => e.course))];
      const courses = await Promise.all(
        courseIds.map((id) => courseService.getCourse(id).catch(() => null)),
      );
      const lessonCountMap: Record<string, number> = {};
      courses.forEach((c) => {
        if (c)
          lessonCountMap[c.id] =
            c.modules?.reduce((s, m) => s + (m.lessons?.length || 0), 0) ?? 0;
      });
      const tMap: Record<string, string | undefined> = {};
      courses.forEach((c) => {
        if (c) tMap[c.id] = c.thumbnail;
      });
      setThumbnailMap(tMap);
      const map: Record<string, number> = {};
      progressResults.forEach(({ enrollmentId, progress }) => {
        const e = enrollments.find((en) => en.id === enrollmentId);
        if (!e) return;
        const total = lessonCountMap[e.course] ?? 0;
        const completed = progress.filter((p) => p.is_completed).length;
        if (total > 0) map[enrollmentId] = (completed / total) * 100;
      });
      setProgressMap(map);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const firstName = user?.full_name?.split(" ")[0] || "Student";

  const statItems = [
    {
      icon: "trending-up" as const,
      label: "In Progress",
      value: stats?.courses_in_progress ?? 0,
      color: colors.info,
    },
    {
      icon: "checkmark-circle" as const,
      label: "Completed",
      value: stats?.courses_completed ?? 0,
      color: colors.success,
    },
    {
      icon: "flame" as const,
      label: "Streak",
      value: `${stats?.streak_days ?? 0}d`,
      color: colors.warning,
    },
    {
      icon: "star" as const,
      label: "Avg Score",
      value: `${Math.round(stats?.average_quiz_score ?? 0)}%`,
      color: colors.primary,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={`Hi, ${firstName}`}
        subtitle="Ready to learn something new?"
        rightAction={
          <View style={{ flexDirection: "row", gap: 12 }}>
            <PressScale
              onPress={() => router.push("/(tabs)/more/messages")}
              accessibilityLabel="Messages"
            >
              <Ionicons
                name="chatbubbles-outline"
                size={22}
                color={colors.text}
              />
            </PressScale>
            <NotificationBell />
            <ThemeSwitcher />
            <LanguageSwitcher />
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl,
          paddingBottom: Spacing["6xl"],
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={{ flex: 1, minWidth: "45%" }}>
                  <SkeletonLoader height={90} rounded="xl" />
                </View>
              ))
            : statItems.map((s) => <StatsCard key={s.label} {...s} />)}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText variant="h3" bold>
            Continue Learning
          </ThemedText>
          {enrollments.length > 3 && (
            <PressScale onPress={() => router.push("/(tabs)/courses")}>
              <ThemedText variant="caption" style={{ color: colors.primary }}>
                See all
              </ThemedText>
            </PressScale>
          )}
        </View>

        {loading ? (
          <>
            <SkeletonLoader
              height={180}
              rounded="xl"
              style={{ marginBottom: Spacing.md }}
            />
            <SkeletonLoader height={180} rounded="xl" />
          </>
        ) : enrollments.length === 0 ? (
          <ThemedView
            variant="card"
            rounded="xl"
            elevated
            style={{ padding: Spacing["3xl"], alignItems: "center" }}
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons
                name="school-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <ThemedText
              variant="body"
              color="secondary"
              style={{ marginTop: Spacing.md, textAlign: "center" }}
            >
              No enrolled courses yet.
            </ThemedText>
            <PressScale
              onPress={() => router.push("/(tabs)/courses")}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <ThemedText bold style={{ color: "#fff" }}>
                Browse Courses
              </ThemedText>
            </PressScale>
          </ThemedView>
        ) : (
          enrollments.slice(0, 3).map((e, i) => (
            <FadeIn key={e.id} delay={i * 50}>
              <CourseCard
                title={e.course_title}
                instructor={e.instructor_name}
                thumbnail={e.thumbnail || thumbnailMap[e.course]}
                progress={progressMap[e.id]}
                onPress={() => router.push(`/course/${e.course}`)}
              />
            </FadeIn>
          ))
        )}

        {recommended.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText variant="h3" bold>
                Recommended for You
              </ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -Spacing.xl }}
            >
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: Spacing.xl,
                  gap: Spacing.md,
                }}
              >
                {recommended.map((r, i) => (
                  <FadeIn key={r.id} delay={i * 50}>
                    <PressScale
                      onPress={() => router.push(`/course/${r.id}`)}
                      style={{ width: 220 }}
                    >
                      <ThemedView
                        variant="card"
                        rounded="xl"
                        elevated
                        style={{ overflow: "hidden" }}
                      >
                        <View
                          style={[
                            styles.recThumb,
                            {
                              backgroundColor: colors.primaryLight,
                              overflow: "hidden",
                            },
                          ]}
                        >
                          {r.thumbnail_url ? (
                            <Image
                              source={{ uri: r.thumbnail_url }}
                              style={{ width: "100%", height: "100%" }}
                            />
                          ) : (
                            <View
                              style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Ionicons
                                name="compass-outline"
                                size={32}
                                color={colors.primary}
                              />
                            </View>
                          )}
                        </View>
                        <View style={{ padding: Spacing.md }}>
                          <ThemedText variant="body" bold numberOfLines={2}>
                            {r.title}
                          </ThemedText>
                          <ThemedText
                            variant="caption"
                            color="secondary"
                            style={{ marginTop: 4 }}
                          >
                            {r.category_name || "Course"}
                          </ThemedText>
                        </View>
                      </ThemedView>
                    </PressScale>
                  </FadeIn>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Activity Feed */}
        {!loading && <ActivityFeed colors={colors} />}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  LESSON_STARTED: "Started a lesson",
  LESSON_COMPLETED: "Completed a lesson",
  QUIZ_PASSED: "Passed a quiz",
  QUIZ_FAILED: "Attempted a quiz",
  COURSE_ENROLLED: "Enrolled in a course",
  COURSE_COMPLETED: "Completed a course",
  CERTIFICATE_CLAIMED: "Claimed a certificate",
  NOTE_CREATED: "Added a note",
  ASSIGNMENT_SUBMITTED: "Submitted an assignment",
  FOCUS_SESSION: "Completed a focus session",
};

const ACTIVITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  LESSON_STARTED: "play-circle",
  LESSON_COMPLETED: "checkmark-circle",
  QUIZ_PASSED: "trophy",
  QUIZ_FAILED: "help-circle",
  COURSE_ENROLLED: "book",
  COURSE_COMPLETED: "flag",
  CERTIFICATE_CLAIMED: "star",
  NOTE_CREATED: "document-text",
  ASSIGNMENT_SUBMITTED: "clipboard",
  FOCUS_SESSION: "time",
};

function ActivityFeed({ colors }: { colors: Record<string, string> }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    learningService
      .listActivities()
      .then((d) => setActivities(d.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || activities.length === 0) return null;

  return (
    <>
      <View style={styles.sectionHeader}>
        <ThemedText variant="h3" bold>
          Recent Activity
        </ThemedText>
      </View>
      <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.md }}>
        {activities.slice(0, 5).map((a, i) => (
          <View
            key={a.id}
            style={[
              i > 0 && {
                borderTopWidth: 1,
                borderTopColor: colors.border + "44",
                marginTop: Spacing.sm,
                paddingTop: Spacing.sm,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={ACTIVITY_ICONS[a.kind] || "time-outline"}
                  size={16}
                  color={colors.primary}
                />
              </View>
              <ThemedText
                variant="caption"
                color="secondary"
                style={{ marginLeft: Spacing.sm, flex: 1 }}
              >
                {ACTIVITY_LABELS[a.kind] || "Activity"}
              </ThemedText>
              <ThemedText variant="caption" color="muted">
                {new Date(a.created_at).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        ))}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  recThumb: {
    width: "100%",
    height: 100,
  },
});
