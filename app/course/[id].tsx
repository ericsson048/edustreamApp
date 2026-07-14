import { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { courseService, enrollmentService, type Course, type Enrollment } from '../../src/services/courses';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { useAlert } from '../../src/components/AlertDialog';
import { reviewService, Review } from '../../src/services/reviewService';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  VIDEO: 'play-circle',
  TEXT: 'document-text',
  QUIZ: 'help-circle',
  ASSIGNMENT: 'clipboard',
  DOWNLOAD: 'cloud-download',
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAlert();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      courseService.getCourse(id),
      enrollmentService.listEnrollments({ course: id, is_active: true }).then(d => d.results[0] ?? null).catch(() => null),
    ]).then(([c, e]) => {
      setCourse(c);
      setEnrollment(e);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const lessonCount = course?.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) ?? 0;

  const handleEnroll = async () => {
    if (!id) return;
    setEnrolling(true);
    try {
      const isFree = course?.price ? parseFloat(course.price) === 0 : true;
      if (isFree) {
        const enrolled = await enrollmentService.createEnrollment(id);
        setEnrollment(enrolled);
        await alert({ title: 'Enrolled!', message: 'You are now enrolled in this course.' });
      } else {
        router.push(`/checkout/${id}`);
      }
    } catch {
      await alert({ title: 'Error', message: 'Could not enroll. Please try again.' });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing['6xl'] }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ padding: Spacing.xl }}>
            <SkeletonLoader height={200} rounded="xl" />
            <SkeletonLoader height={30} rounded="lg" style={{ marginTop: Spacing.md, width: '70%' }} />
            <SkeletonLoader height={20} rounded="lg" style={{ marginTop: Spacing.sm, width: '50%' }} />
            <SkeletonLoader height={100} rounded="lg" style={{ marginTop: Spacing.lg }} />
          </View>
        ) : course ? (
          <>
            {course.thumbnail ? (
              <Image source={{ uri: course.thumbnail }} style={styles.hero} />
            ) : (
              <View style={[styles.hero, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="library-outline" size={48} color={colors.primary} />
              </View>
            )}

            <View style={{ padding: Spacing.xl }}>
              <ThemedText variant="h2" bold>{course.title}</ThemedText>
              {course.subtitle ? (
                <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>{course.subtitle}</ThemedText>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md }}>
                <Ionicons name="person-circle-outline" size={20} color={colors.textMuted} />
                <ThemedText variant="body" style={{ marginLeft: Spacing.sm }}>{course.instructor_name || 'Instructor'}</ThemedText>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md }}>
                <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="stats-chart-outline" size={12} color={colors.primary} />
                  <ThemedText variant="label" style={{ color: colors.primary, marginLeft: 4 }}>{course.level}</ThemedText>
                </View>
                {course.category && (
                  <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                    <ThemedText variant="label" color="secondary">{course.category}</ThemedText>
                  </View>
                )}
                {course.estimated_hours ? (
                  <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                    <ThemedText variant="label" color="secondary" style={{ marginLeft: 4 }}>{course.estimated_hours}h</ThemedText>
                  </View>
                ) : null}
                {lessonCount > 0 && (
                  <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
                    <ThemedText variant="label" color="secondary" style={{ marginLeft: 4 }}>{lessonCount} lessons</ThemedText>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md }}>
                {course.average_rating ? (
                  <>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <ThemedText variant="body" bold style={{ color: colors.warning, marginLeft: 4 }}>{course.average_rating.toFixed(1)}</ThemedText>
                  </>
                ) : null}
                <ThemedText variant="caption" color="muted" style={{ marginLeft: 8 }}>
                  <Ionicons name="people-outline" size={14} /> {course.enrollments_count ?? 0} enrolled
                </ThemedText>
              </View>

              {/* Enrollment CTA */}
              <TouchableOpacity
                onPress={enrollment ? () => router.push(`/player/${id}/${course?.modules?.[0]?.lessons?.[0]?.id || ''}`) : handleEnroll}
                disabled={enrolling}
                style={[styles.ctaBtn, { backgroundColor: enrollment ? colors.primary : parseFloat(course.price || '0') > 0 ? colors.success : colors.success }]}
              >
                {enrolling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={enrollment ? 'play-circle-outline' : 'cart-outline'}
                      size={22}
                      color="#fff"
                    />
                    <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>
                      {enrollment ? 'Continue Learning' : parseFloat(course.price || '0') > 0 ? `Enroll for $${parseFloat(course.price).toFixed(0)}` : 'Enroll for Free'}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {/* Description */}
              <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.xl }}>
                <ThemedText variant="body" bold>Description</ThemedText>
                <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm, lineHeight: 22 }}>{course.description}</ThemedText>
              </ThemedView>

              {/* Learning Objectives */}
              {course.learning_objectives?.length > 0 && (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="bulb-outline" size={18} color={colors.warning} />
                    <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>What you'll learn</ThemedText>
                  </View>
                  {course.learning_objectives.map((obj, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <ThemedText variant="body" color="secondary" style={{ marginLeft: Spacing.sm, flex: 1 }}>{obj}</ThemedText>
                    </View>
                  ))}
                </ThemedView>
              )}

              {/* Prerequisites */}
              {course.prerequisites?.length > 0 && (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
                    <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>Prerequisites</ThemedText>
                  </View>
                  {course.prerequisites.map((p, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
                      <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                      <ThemedText variant="body" color="secondary" style={{ marginLeft: Spacing.sm }}>{p}</ThemedText>
                    </View>
                  ))}
                </ThemedView>
              )}

              {/* Target Audience */}
              {course.target_audience?.length > 0 && (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={18} color={colors.info} />
                    <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>Target Audience</ThemedText>
                  </View>
                  {course.target_audience.map((a, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
                      <Ionicons name="person" size={14} color={colors.textMuted} />
                      <ThemedText variant="body" color="secondary" style={{ marginLeft: Spacing.sm }}>{a}</ThemedText>
                    </View>
                  ))}
                </ThemedView>
              )}

              {/* Reviews */}
              <ReviewsSection courseId={course.id} colors={colors} />

              {/* Course Content - Modules */}
              {course.modules?.length > 0 && (
                <View style={{ marginTop: Spacing.xl }}>
                  <ThemedText variant="h3" bold style={{ marginBottom: Spacing.md }}>Course Content</ThemedText>
                  <ThemedText variant="caption" color="secondary" style={{ marginTop: -Spacing.sm, marginBottom: Spacing.md }}>
                    {course.modules.length} modules · {lessonCount} lessons
                  </ThemedText>

                  {course.modules.map((m, idx) => (
                    <ThemedView key={m.id} variant="card" rounded="xl" elevated style={{ marginBottom: Spacing.md, overflow: 'hidden' }}>
                      <TouchableOpacity
                        style={{ padding: Spacing.lg, backgroundColor: colors.surfaceSecondary }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.moduleNum, { backgroundColor: colors.primaryLight }]}>
                            <ThemedText variant="label" style={{ color: colors.primary }}>{idx + 1}</ThemedText>
                          </View>
                          <View style={{ flex: 1, marginLeft: Spacing.md }}>
                            <ThemedText variant="body" bold>{m.title}</ThemedText>
                            {m.lessons && <ThemedText variant="caption" color="secondary">{m.lessons.length} lessons</ThemedText>}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {m.lessons?.map((l) => (
                        <TouchableOpacity
                          key={l.id}
                          onPress={() => router.push(`/player/${course.id}/${l.id}`)}
                          style={styles.lessonItem}
                        >
                          <Ionicons
                            name={typeIcons[l.lesson_type] || 'play-circle-outline'}
                            size={20}
                            color={l.lesson_type === 'QUIZ' ? colors.warning : l.lesson_type === 'ASSIGNMENT' ? colors.info : colors.primary}
                          />
                          <View style={{ flex: 1, marginLeft: Spacing.md }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <ThemedText variant="body" style={{ flex: 1 }}>{l.title}</ThemedText>
                              {l.is_preview && (
                                <View style={[styles.previewBadge, { backgroundColor: colors.success + '20' }]}>
                                  <ThemedText variant="label" style={{ color: colors.success }}>FREE</ThemedText>
                                </View>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <ThemedText variant="caption" color="muted">{l.lesson_type}</ThemedText>
                              {l.duration_seconds > 0 && (
                                <ThemedText variant="caption" color="muted" style={{ marginLeft: 8 }}>
                                  {Math.floor(l.duration_seconds / 60)} min
                                </ThemedText>
                              )}
                              {l.resources?.length > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                                  <Ionicons name="attach-outline" size={12} color={colors.textMuted} />
                                  <ThemedText variant="caption" color="muted" style={{ marginLeft: 2 }}>{l.resources.length}</ThemedText>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ThemedView>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['5xl'] }}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md }}>Course not found.</ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </View>
  );
}

function ReviewsSection({ courseId, colors }: { courseId: string; colors: Record<string, string> }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    reviewService.list(courseId).then(d => setReviews(d.results ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, [courseId]);

  const submitReview = async () => {
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const r = await reviewService.create({ course: courseId, rating, comment: comment.trim() });
      setReviews(prev => [r, ...prev]);
      setComment('');
      setShowForm(false);
    } catch {} finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="star" size={18} color={colors.warning} />
          <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>Reviews ({reviews.length})</ThemedText>
        </View>
        <TouchableOpacity onPress={() => setShowForm(prev => !prev)}>
          <ThemedText variant="label" style={{ color: colors.primary }}>{showForm ? 'Cancel' : 'Write a review'}</ThemedText>
        </TouchableOpacity>
      </View>

      {showForm && (
        <ThemedView variant="secondary" rounded="lg" style={{ padding: Spacing.md, marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: Spacing.sm }}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={24} color={colors.warning} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={{
              borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: Spacing.sm,
              color: colors.text, backgroundColor: colors.background, minHeight: 80, textAlignVertical: 'top',
            }}
            placeholder="Share your experience..."
            placeholderTextColor={colors.text + '66'}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            onPress={submitReview}
            disabled={!comment.trim() || submitting}
            style={[{ backgroundColor: colors.primary, padding: Spacing.md, borderRadius: 12, marginTop: Spacing.sm, opacity: !comment.trim() || submitting ? 0.5 : 1, alignItems: 'center' }]}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText bold style={{ color: '#fff' }}>Submit Review</ThemedText>}
          </TouchableOpacity>
        </ThemedView>
      )}

      {reviews.map(r => (
        <View key={r.id} style={{ paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.border + '44', marginTop: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="person-circle" size={16} color={colors.textMuted} />
              <ThemedText variant="caption" bold>{r.user_name || 'User'}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={12} color={colors.warning} />
              ))}
            </View>
          </View>
          <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>{r.comment}</ThemedText>
        </View>
      ))}

      {reviews.length === 0 && (
        <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.sm }}>No reviews yet. Be the first!</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  hero: {
    width: '100%',
    height: 200,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  moduleNum: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  previewBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  ctaBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
});
