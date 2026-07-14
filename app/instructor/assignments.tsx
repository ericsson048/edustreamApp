import { useEffect, useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Modal, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAlert } from '../../src/components/AlertDialog';
import { courseService } from '../../src/services/courses';
import { learningService, type Assignment, type Submission } from '../../src/services/learning';
import { BorderRadius, Spacing, FontSize } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

type DraftGrade = { grade: string; feedback: string };

export default function InstructorAssignmentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { alert } = useAlert();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, DraftGrade>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);

  const refresh = async () => {
    if (!user?.id) return;
    try {
      const [courseData, assignmentList, submissionList] = await Promise.all([
        courseService.listCourses({ instructor: user.id }),
        learningService.listAssignments(),
        learningService.listSubmissions(),
      ]);
      const courseList = (courseData.results ?? []).map((c) => ({ id: c.id, title: c.title }));
      setCourses(courseList);
      setAssignments(assignmentList.results ?? []);
      setSubmissions(submissionList.results ?? []);
      setCourseId((current) => current || courseList[0]?.id || '');
      setDrafts(
        Object.fromEntries(
          (submissionList.results ?? []).map((s) => [
            s.id,
            { grade: s.grade || '', feedback: s.feedback || '' },
          ]),
        ),
      );
    } catch {
      await alert({ title: 'Error', message: 'Could not load assignments.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const onRefresh = () => { setRefreshing(true); refresh(); };

  const filteredAssignments = useMemo(
    () => assignments.filter((a) => !courseId || a.course === courseId),
    [assignments, courseId],
  );

  const filteredSubmissions = useMemo(
    () => submissions.filter((s) => !courseId || s.course_id === courseId),
    [submissions, courseId],
  );

  const selectedCourseTitle = courses.find((c) => c.id === courseId)?.title || 'Select a course';

  const handleCreate = async () => {
    if (!courseId || !title.trim() || !dueDate) {
      await alert({ title: 'Error', message: 'Course, title and due date are required.' });
      return;
    }
    setSaving(true);
    try {
      await learningService.createAssignment({
        course: courseId,
        title: title.trim(),
        description,
        due_date: new Date(dueDate).toISOString(),
        points: 100,
        type: 'PROJECT',
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      await refresh();
    } catch {
      await alert({ title: 'Error', message: 'Could not create assignment.' });
    } finally {
      setSaving(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    const draft = drafts[submissionId];
    if (!draft?.grade) {
      await alert({ title: 'Error', message: 'Add a grade before saving.' });
      return;
    }
    try {
      await learningService.gradeSubmission(submissionId, {
        grade: draft.grade,
        feedback: draft.feedback,
        status: 'GRADED',
      });
      setGradingId(null);
      await refresh();
    } catch {
      await alert({ title: 'Error', message: 'Could not save grade.' });
    }
  };

  const updateDraft = (id: string, field: keyof DraftGrade, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { grade: '', feedback: '' }), [field]: value },
    }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemedView variant="surface" style={{ paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <ThemedText variant="h1" bold>Grading & Assignments</ThemedText>
      </ThemedView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} height={100} rounded="xl" style={{ marginBottom: Spacing.md }} />
          ))
        ) : (
          <>
            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginBottom: Spacing.xl }}>
              <ThemedText variant="body" bold style={{ marginBottom: Spacing.lg }}>Create an assignment</ThemedText>

              <ThemedText variant="caption" color="secondary" style={{ marginBottom: Spacing.xs }}>Course</ThemedText>
              <TouchableOpacity
                onPress={() => setShowCoursePicker(true)}
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <ThemedText variant="body" color={courseId ? undefined : 'muted'} style={{ flex: 1 }} numberOfLines={1}>
                  {selectedCourseTitle}
                </ThemedText>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>Title</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Assignment title"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />

              <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>Description</ThemedText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Assignment brief"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, minHeight: 72, textAlignVertical: 'top' }]}
              />

              <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>Due date</ThemedText>
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />

              <TouchableOpacity
                onPress={handleCreate}
                disabled={saving || !courseId || !title.trim() || !dueDate}
                activeOpacity={0.7}
                style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (saving || !courseId || !title.trim() || !dueDate) ? 0.5 : 1, marginTop: Spacing.lg }]}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <ThemedText variant="body" bold style={{ color: '#fff', marginLeft: Spacing.sm }}>
                  {saving ? 'Adding...' : 'Add assignment'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView variant="card" rounded="xl" elevated style={{ marginBottom: Spacing.xl, overflow: 'hidden' }}>
              <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                <ThemedText variant="body" bold>Existing assignments</ThemedText>
              </View>
              {filteredAssignments.length === 0 ? (
                <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                  <ThemedText variant="caption" color="muted">No assignment for this scope yet.</ThemedText>
                </View>
              ) : (
                filteredAssignments.map((a) => (
                  <View key={a.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="body" bold>{a.title}</ThemedText>
                      <ThemedText variant="caption" color="secondary">{a.course_title || a.course}</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: Spacing.sm }}>
                        <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                          <ThemedText variant="label" style={{ color: colors.primary, fontSize: FontSize.xs }}>{a.type}</ThemedText>
                        </View>
                      </View>
                      {a.description ? (
                        <ThemedText variant="caption" color="muted" style={{ marginTop: 4 }}>{a.description}</ThemedText>
                      ) : null}
                      <ThemedText variant="caption" color="muted" style={{ marginTop: 4 }}>
                        Due {new Date(a.due_date).toLocaleString()}
                      </ThemedText>
                    </View>
                  </View>
                ))
              )}
            </ThemedView>

            <ThemedView variant="card" rounded="xl" elevated style={{ overflow: 'hidden' }}>
              <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                <ThemedText variant="body" bold>Submissions</ThemedText>
              </View>
              {filteredSubmissions.length === 0 ? (
                <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                  <ThemedText variant="caption" color="muted">No submissions found.</ThemedText>
                </View>
              ) : (
                filteredSubmissions.map((s) => (
                  <View key={s.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="body" bold>{s.assignment_title || s.assignment}</ThemedText>
                      <ThemedText variant="caption" color="secondary">{s.student_name || s.student}</ThemedText>
                      <ThemedText variant="caption" color="muted" style={{ marginTop: 2 }}>
                        {(s.course_title || 'Course')} · {new Date(s.submitted_at).toLocaleString()}
                      </ThemedText>
                      <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary, marginTop: 4, alignSelf: 'flex-start' }]}>
                        <ThemedText variant="label" style={{ fontSize: FontSize.xs }}>{s.status}</ThemedText>
                      </View>
                    </View>

                    {gradingId === s.id ? (
                      <View style={{ marginTop: Spacing.md }}>
                        <TextInput
                          value={drafts[s.id]?.grade || ''}
                          onChangeText={(v) => updateDraft(s.id, 'grade', v)}
                          placeholder="Grade"
                          keyboardType="number-pad"
                          placeholderTextColor={colors.textMuted}
                          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginBottom: Spacing.sm }]}
                        />
                        <TextInput
                          value={drafts[s.id]?.feedback || ''}
                          onChangeText={(v) => updateDraft(s.id, 'feedback', v)}
                          placeholder="Feedback"
                          placeholderTextColor={colors.textMuted}
                          multiline
                          numberOfLines={2}
                          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, minHeight: 48, textAlignVertical: 'top', marginBottom: Spacing.sm }]}
                        />
                        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                          <TouchableOpacity
                            onPress={() => handleGrade(s.id)}
                            activeOpacity={0.7}
                            style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
                          >
                            <ThemedText variant="label" bold style={{ color: '#fff' }}>Save grade</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setGradingId(null)}
                            activeOpacity={0.7}
                            style={[styles.primaryBtn, { backgroundColor: colors.surfaceSecondary }]}
                          >
                            <ThemedText variant="label" bold color="secondary">Cancel</ThemedText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setGradingId(s.id)}
                        activeOpacity={0.7}
                        style={[styles.primaryBtn, { backgroundColor: colors.primaryLight, marginTop: Spacing.md, alignSelf: 'flex-start' }]}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.primary} />
                        <ThemedText variant="label" bold style={{ color: colors.primary, marginLeft: 4 }}>Grade</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ThemedView>
          </>
        )}
      </ScrollView>

      <View style={StyleSheet.absoluteFill} pointerEvents={showCoursePicker ? 'auto' : 'none'}>
        {showCoursePicker && (
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: Spacing['2xl'] }}
            activeOpacity={1}
            onPress={() => setShowCoursePicker(false)}
          >
            <View style={{ backgroundColor: colors.surface, borderRadius: BorderRadius['2xl'], padding: Spacing.xl, maxHeight: '60%' }}>
              <ThemedText variant="body" bold style={{ marginBottom: Spacing.md }}>Select a course</ThemedText>
              <ScrollView style={{ maxHeight: 400 }}>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => { setCourseId(c.id); setShowCoursePicker(false); }}
                    style={{
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.md,
                      borderRadius: BorderRadius.lg,
                      backgroundColor: courseId === c.id ? colors.primaryLight : 'transparent',
                      marginBottom: Spacing.xs,
                    }}
                  >
                    <ThemedText variant="body" bold={courseId === c.id}>{c.title}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: FontSize.base,
  },
  primaryBtn: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  row: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
});
