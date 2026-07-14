import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { ResizeMode, Video } from 'expo-av';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { MarkdownRenderer } from '../../../src/components/MarkdownRenderer';
import { playerService, type Lesson } from '../../../src/services/player';
import { courseService, enrollmentService, type Progress, type Course } from '../../../src/services/courses';
import { learningService } from '../../../src/services/learning';
import { scheduleService } from '../../../src/services/schedule';
import { certificateService } from '../../../src/services/certificate';
import { noteService, Note } from '../../../src/services/noteService';
import { BorderRadius, Spacing } from '../../../src/theme/colors';

import { SkeletonLoader } from '../../../src/components/SkeletonLoader';
import { useAlert } from '../../../src/components/AlertDialog';

const typeConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  VIDEO: { icon: 'play-circle', color: '#6366F1', label: 'Video' },
  TEXT: { icon: 'document-text', color: '#22C55E', label: 'Text' },
  QUIZ: { icon: 'help-circle', color: '#F59E0B', label: 'Quiz' },
  ASSIGNMENT: { icon: 'clipboard', color: '#EF4444', label: 'Assignment' },
  DOWNLOAD: { icon: 'cloud-download', color: '#14B8A6', label: 'Download' },
  LIVE: { icon: 'radio', color: '#EF4444', label: 'Live' },
};

export default function PlayerScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAlert();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [allProgress, setAllProgress] = useState<Progress[]>([]);
  const [completing, setCompleting] = useState(false);
  const [certificateClaiming, setCertificateClaiming] = useState(false);
  const videoRef = useRef<Video>(null);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [liveSessionMap, setLiveSessionMap] = useState<Record<string, string>>({});
  const [quizId, setQuizId] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId || !courseId) return;
    Promise.all([
      playerService.getLesson(lessonId),
      courseService.getCourse(courseId),
      enrollmentService.listEnrollments({ course: courseId, is_active: true }).then(d => d.results[0] ?? null).catch(() => null),
      scheduleService.listSessions({ course: courseId }).then(d => {
        const map: Record<string, string> = {};
        (d.results ?? []).forEach(s => { map[s.title] = s.id; });
        return map;
      }).catch(() => ({})),
    ]).then(([l, c, enrollment, liveMap]) => {
      setLesson(l);
      setCourse(c);
      setLiveSessionMap(liveMap);
      if (l.lesson_type === 'QUIZ') {
        learningService.listQuizzesByLesson(l.id).then(q => {
          const quiz = (q.results ?? [])[0];
          if (quiz) setQuizId(quiz.id);
        }).catch(() => {});
      }
      if (enrollment) {
        courseService.listProgress({ enrollment: enrollment.id }).then(p => {
          setAllProgress(p.results ?? []);
          const current = (p.results ?? []).find(p => p.lesson === l.id);
          setProgress(current ?? null);
        }).catch(() => {});
        certificateService.list({ course: courseId }).then(certs => {
          if ((certs.results ?? []).length > 0) setHasCertificate(true);
        }).catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [lessonId, courseId]);

  const cfg = lesson ? typeConfig[lesson.lesson_type] || typeConfig.TEXT : typeConfig.TEXT;
  const hasVideo = lesson?.video || lesson?.video_file || lesson?.video_url;

  const allLessons = course?.modules?.flatMap(m => m.lessons ?? []) ?? [];
  const currentLessonIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;
  const totalLessons = allLessons.length;
  const completedLessons = allProgress.filter(p => p.is_completed).length;
  const courseCompleted = totalLessons > 0 && completedLessons >= totalLessons;
  const isLessonCompleted = progress?.is_completed ?? false;

  const handleMarkComplete = async () => {
    if (!courseId || !lesson || !course) return;
    setCompleting(true);
    try {
      const enrollments = await enrollmentService.listEnrollments({ course: courseId, is_active: true });
      const enrollment = enrollments.results[0];
      if (!enrollment) { await alert({ title: 'Error', message: 'You are not enrolled in this course.' }); return; }
      const updated = await courseService.upsertProgress(progress?.id ?? null, { enrollment: enrollment.id, lesson: lesson.id, completion: 100, is_completed: true });
      setProgress(updated);
      setAllProgress(prev => {
        const filtered = prev.filter(p => p.lesson !== lesson.id);
        return [...filtered, updated];
      });
      await alert({ title: 'Completed!', message: 'Lesson marked as complete.' });
    } catch {
      await alert({ title: 'Error', message: 'Could not save progress.' });
    } finally {
      setCompleting(false);
    }
  };

  const handleClaimCertificate = async () => {
    if (!courseId) return;
    setCertificateClaiming(true);
    try {
      const cert = await certificateService.claim(courseId);
      setHasCertificate(true);
      await alert({ title: 'Certificate Unlocked!', message: `Code: ${cert.certificate_code}` });
    } catch {
      await alert({ title: 'Incomplete', message: 'Complete all lessons before claiming your certificate.' });
    } finally {
      setCertificateClaiming(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        {totalLessons > 0 && (
          <ThemedText variant="caption" color="secondary">
            {completedLessons}/{totalLessons} complete
          </ThemedText>
        )}
      </View>

      {totalLessons > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={[styles.progressFill, { width: `${Math.round((completedLessons / totalLessons) * 100)}%`, backgroundColor: colors.primary }]} />
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing['6xl'] }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ padding: Spacing.xl }}>
            <SkeletonLoader height={200} rounded="xl" />
            <SkeletonLoader height={30} rounded="lg" style={{ marginTop: Spacing.md, width: '80%' }} />
            <SkeletonLoader height={200} rounded="lg" style={{ marginTop: Spacing.lg }} />
          </View>
        ) : lesson ? (
          <>
            {/* Video player */}
            {hasVideo && (
              <View style={[styles.videoPlayer, { backgroundColor: '#000' }]}>
                <Video
                  ref={videoRef}
                  source={{ uri: lesson.video_file || lesson.video || lesson.video_url || '' }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  onPlaybackStatusUpdate={() => {}}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            )}

            <View style={{ padding: Spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.typeBadge, { backgroundColor: cfg.color + '20' }]}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText variant="h2" bold>{lesson.title}</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <ThemedText variant="label" style={{ color: cfg.color }}>{cfg.label}</ThemedText>
                    {lesson.is_preview && (
                      <View style={[styles.previewBadge, { backgroundColor: colors.success + '20', marginLeft: Spacing.sm }]}>
                        <ThemedText variant="label" style={{ color: colors.success }}>FREE</ThemedText>
                      </View>
                    )}
                    {lesson.duration_seconds > 0 && (
                      <ThemedText variant="caption" color="muted" style={{ marginLeft: Spacing.sm }}>
                        · {Math.floor(lesson.duration_seconds / 60)} min
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>

              {/* Type-specific actions */}
              {lesson.lesson_type === 'QUIZ' && (
                <TouchableOpacity
                  onPress={() => {
                    if (quizId) router.push(`/quiz/${quizId}`);
                    else alert({ title: 'Quiz not found', message: 'No quiz is associated with this lesson.' });
                  }}
                  style={[styles.actionBtn, { backgroundColor: colors.warning, marginTop: Spacing.lg }]}
                >
                  <Ionicons name="help-circle-outline" size={20} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Take Quiz</ThemedText>
                </TouchableOpacity>
              )}

              {lesson.lesson_type === 'ASSIGNMENT' && (
                <TouchableOpacity
                  onPress={() => router.push(`/assignments/${lesson.id}/submit`)}
                  style={[styles.actionBtn, { backgroundColor: colors.error, marginTop: Spacing.lg }]}
                >
                  <Ionicons name="clipboard-outline" size={20} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Submit Assignment</ThemedText>
                </TouchableOpacity>
              )}

              {lesson.lesson_type === 'LIVE' && liveSessionMap[lesson.title] && (
                <TouchableOpacity
                  onPress={() => router.push(`/live/${liveSessionMap[lesson.title]}`)}
                  style={[styles.actionBtn, { backgroundColor: colors.error, marginTop: Spacing.lg }]}
                >
                  <Ionicons name="radio-outline" size={20} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Join Live Session</ThemedText>
                </TouchableOpacity>
              )}

              {/* Content */}
              {lesson.content && lesson.lesson_type === 'TEXT' && (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
                  <MarkdownRenderer content={lesson.content} />
                </ThemedView>
              )}

              {/* Resources */}
              {lesson.resources?.length > 0 && (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                    <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>Resources ({lesson.resources.length})</ThemedText>
                  </View>
                  {lesson.resources.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => {
                        const url = r.file_download_url || r.file;
                        if (url) Linking.openURL(url);
                      }}
                      style={[styles.resourceItem, { borderTopColor: colors.border }]}
                    >
                      <View style={[styles.resourceIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name={r.kind === 'PDF' ? 'document' : 'attach-outline'} size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.md }}>
                        <ThemedText variant="body">{r.title || 'Resource'}</ThemedText>
                        {r.description ? <ThemedText variant="caption" color="secondary" numberOfLines={1}>{r.description}</ThemedText> : null}
                        <ThemedText variant="label" style={{ color: colors.primary, marginTop: 2 }}>{r.kind} · Tap to open</ThemedText>
                      </View>
                      <Ionicons name="download-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </ThemedView>
              )}

              {/* Transcript */}
              {lesson.transcript ? (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                    <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>Transcript</ThemedText>
                  </View>
                  <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm, lineHeight: 22 }}>{lesson.transcript}</ThemedText>
                </ThemedView>
              ) : null}

              {/* Instructor Notes */}
              {lesson.instructor_notes ? (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.warning }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.warning} />
                    <ThemedText variant="body" bold style={{ color: colors.warning, marginLeft: Spacing.sm }}>Instructor Notes</ThemedText>
                  </View>
                  <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm, lineHeight: 22 }}>{lesson.instructor_notes}</ThemedText>
                </ThemedView>
              ) : null}

              {/* Notes */}
              <NotesSection lessonId={lesson.id} colors={colors} />

              {/* Mark Complete button */}
              {lesson.lesson_type !== 'LIVE' && (
                isLessonCompleted ? (
                  <ThemedView variant="secondary" rounded="xl" style={{ padding: Spacing.md, marginTop: Spacing.xl, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <ThemedText bold style={{ color: colors.success, marginLeft: Spacing.sm }}>Completed</ThemedText>
                  </ThemedView>
                ) : (
                  <TouchableOpacity
                    onPress={handleMarkComplete}
                    disabled={completing}
                    style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: Spacing.xl }]}
                  >
                    {completing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Mark Complete</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                )
              )}

              {/* Prev / Next lesson navigation */}
              {(prevLesson || nextLesson) && (
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing['2xl'] }}>
                  {prevLesson ? (
                    <TouchableOpacity
                      onPress={() => router.replace(`/player/${courseId}/${prevLesson.id}`)}
                      style={[styles.navLessonBtn, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}
                    >
                      <Ionicons name="chevron-back" size={18} color={colors.text} />
                      <ThemedText variant="caption" bold style={{ marginLeft: 4 }} numberOfLines={1}>Prev</ThemedText>
                    </TouchableOpacity>
                  ) : <View style={{ flex: 1 }} />}
                  {nextLesson ? (
                    <TouchableOpacity
                      onPress={() => router.replace(`/player/${courseId}/${nextLesson.id}`)}
                      style={[styles.navLessonBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    >
                      <ThemedText variant="caption" bold style={{ color: '#fff', marginRight: 4 }} numberOfLines={1}>Next</ThemedText>
                      <Ionicons name="chevron-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : <View style={{ flex: 1 }} />}
                </View>
              )}

              {/* Course completion & certificate */}
              {courseCompleted && (
                <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginTop: Spacing['2xl'], borderLeftWidth: 4, borderLeftColor: colors.success }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.certIcon, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="trophy" size={28} color={colors.success} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <ThemedText variant="h3" bold style={{ color: colors.success }}>Course Complete!</ThemedText>
                      <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                        You&apos;ve completed all {totalLessons} lessons.
                      </ThemedText>
                    </View>
                  </View>
                  {hasCertificate ? (
                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)/more/certificate')}
                      style={[styles.actionBtn, { backgroundColor: colors.success, marginTop: Spacing.md }]}
                    >
                      <Ionicons name="ribbon-outline" size={18} color="#fff" />
                      <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>View Certificate</ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleClaimCertificate}
                      disabled={certificateClaiming}
                      style={[styles.actionBtn, { backgroundColor: colors.success, marginTop: Spacing.md }]}
                    >
                      {certificateClaiming ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="ribbon-outline" size={18} color="#fff" />
                          <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Claim Certificate</ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </ThemedView>
              )}
            </View>
          </>
        ) : (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['5xl'] }}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md }}>Lesson not found.</ThemedText>
          </ThemedView>
        )}
      </ScrollView>
      <TouchableOpacity
        onPress={() => router.push(`/ai-tutor/${courseId}/${lessonId}`)}
        style={[styles.tutorFab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function NotesSection({ lessonId, colors }: { lessonId: string; colors: Record<string, string> }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    noteService.list(lessonId).then(d => { setNotes(d.results ?? []); }).catch(() => {}).finally(() => setLoading(false));
  }, [lessonId]);

  const addNote = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const note = await noteService.create({ lesson: lessonId, content: text.trim() });
      setNotes(prev => [...prev, note]);
      setText('');
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
      <TouchableOpacity onPress={() => setExpanded(prev => !prev)} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="document-text-outline" size={18} color={colors.primary} />
        <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm, flex: 1 }}>My Notes ({notes.length})</ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {expanded && (
        <>
          {notes.map(n => (
            <View key={n.id} style={{ paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + '44' }}>
              <ThemedText variant="body" color="secondary">{n.content}</ThemedText>
            </View>
          ))}
          {!loading && notes.length === 0 && (
            <ThemedText variant="caption" color="secondary" style={{ marginVertical: Spacing.sm }}>No notes yet. Add one below.</ThemedText>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: Spacing.sm, gap: Spacing.sm }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: Spacing.sm,
                color: colors.text,
                backgroundColor: colors.background,
                maxHeight: 80,
              }}
              placeholder="Write a note..."
              placeholderTextColor={colors.text + '66'}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              onPress={addNote}
              disabled={!text.trim() || saving}
              style={[{ backgroundColor: colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 12, opacity: !text.trim() || saving ? 0.5 : 1 }]}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={{ color: '#fff' }}>Save</ThemedText>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  progressBar: {
    height: 4,
    marginHorizontal: Spacing.xl,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  videoPlayer: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tutorFab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
