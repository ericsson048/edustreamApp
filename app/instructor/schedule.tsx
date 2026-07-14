import { useEffect, useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Modal, StyleSheet, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAlert } from '../../src/components/AlertDialog';
import { courseService } from '../../src/services/courses';
import { scheduleService, type LiveSession } from '../../src/services/schedule';
import { BorderRadius, Spacing, FontSize } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

type SessionForm = {
  course: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: LiveSession['status'];
};

const emptyForm: SessionForm = {
  course: '',
  title: '',
  scheduled_at: '',
  duration_minutes: 60,
  status: 'SCHEDULED',
};

function toDateTimeInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

export default function InstructorScheduleScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { alert } = useAlert();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SessionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const statusOptions: { value: LiveSession['status']; label: string }[] = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'LIVE', label: 'Live' },
    { value: 'ENDED', label: 'Ended' },
  ];

  const refresh = async () => {
    if (!user?.id) return;
    try {
      const [courseData, sessionData] = await Promise.all([
        courseService.listCourses({ instructor: user.id }),
        scheduleService.listSessions(),
      ]);
      const courseList = (courseData.results ?? []).map((c) => ({ id: c.id, title: c.title }));
      setCourses(courseList);
      setSessions(sessionData.results ?? []);
      setForm((current) => ({
        ...current,
        course: current.course || courseList[0]?.id || '',
      }));
    } catch {
      await alert({ title: 'Error', message: 'Could not load live sessions.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const onRefresh = () => { setRefreshing(true); refresh(); };

  const orderedSessions = useMemo(
    () => [...sessions]
      .filter((s) => !search.trim() || s.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [sessions, search],
  );

  const stats = useMemo(() => {
    const live = sessions.filter((s) => s.status === 'LIVE').length;
    const scheduled = sessions.filter((s) => s.status === 'SCHEDULED').length;
    const ended = sessions.filter((s) => s.status === 'ENDED').length;
    return { total: sessions.length, live, scheduled, ended };
  }, [sessions]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, course: courses[0]?.id || '' });
    setDialogVisible(true);
  };

  const openEdit = (session: LiveSession) => {
    setEditingId(session.id);
    setForm({
      course: session.course,
      title: session.title,
      scheduled_at: toDateTimeInput(session.scheduled_at),
      duration_minutes: session.duration_minutes,
      status: session.status as LiveSession['status'],
    });
    setDialogVisible(true);
  };

  const submit = async () => {
    if (!form.course || !form.title.trim() || !form.scheduled_at) {
      await alert({ title: 'Error', message: 'Course, title and schedule are required.' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await scheduleService.updateSession(editingId, {
          title: form.title.trim(),
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          duration_minutes: form.duration_minutes,
          status: form.status,
        });
      } else {
        await scheduleService.createSession({
          course: form.course,
          title: form.title.trim(),
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          duration_minutes: form.duration_minutes,
          status: form.status,
        });
      }
      setDialogVisible(false);
      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch {
      await alert({ title: 'Error', message: 'Could not save live session.' });
    } finally {
      setSaving(false);
    }
  };

  const statusConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    SCHEDULED: { icon: 'calendar-outline', color: colors.warning, label: 'SCHEDULED' },
    LIVE: { icon: 'radio-outline', color: colors.error, label: 'LIVE' },
    ENDED: { icon: 'checkmark-outline', color: colors.textMuted, label: 'ENDED' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemedView variant="surface" style={{ paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <ThemedText variant="h1" bold>Schedule</ThemedText>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {stats.total} sessions · {stats.live} live · {stats.scheduled} scheduled · {stats.ended} ended
            </ThemedText>
          </View>
          <TouchableOpacity onPress={openNew} activeOpacity={0.7} style={[styles.fab, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {!loading && orderedSessions.length > 0 && (
          <View style={{ marginBottom: Spacing.md }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search sessions..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
          </View>
        )}

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} height={100} rounded="xl" style={{ marginBottom: Spacing.md }} />
          ))
        ) : orderedSessions.length === 0 && search.trim() ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <ThemedText variant="body" color="secondary">No sessions match &quot;{search}&quot;.</ThemedText>
          </ThemedView>
        ) : orderedSessions.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="videocam-outline" size={36} color={colors.primary} />
            </View>
            <ThemedText variant="body" bold style={{ marginTop: Spacing.md }}>No live sessions yet</ThemedText>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.xs, textAlign: 'center' }}>
              Tap the + button to schedule your first session.
            </ThemedText>
            <TouchableOpacity onPress={openNew} activeOpacity={0.7} style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg }]}>
              <Ionicons name="add" size={16} color="#fff" />
              <ThemedText variant="label" bold style={{ color: '#fff', marginLeft: 4 }}>New Session</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView variant="card" rounded="xl" elevated style={{ overflow: 'hidden' }}>
            {orderedSessions.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig.SCHEDULED;
              return (
                <View key={s.id} style={[styles.sessionItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                    <View style={[styles.sessionIcon, { backgroundColor: s.status === 'LIVE' ? colors.error + '20' : colors.primaryLight }]}>
                      <Ionicons
                        name={s.status === 'LIVE' ? 'radio' : 'videocam-outline'}
                        size={20}
                        color={s.status === 'LIVE' ? colors.error : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
                        <ThemedText variant="body" bold style={{ flexShrink: 1 }}>{s.title}</ThemedText>
                        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                          <ThemedText variant="label" style={{ color: cfg.color, fontSize: FontSize.xs, letterSpacing: 0.5 }}>
                            {cfg.label}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>{s.course_title || 'Course'}</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                          <ThemedText variant="caption" color="muted" style={{ marginLeft: 4 }}>
                            {new Date(s.scheduled_at).toLocaleDateString()}
                          </ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                          <ThemedText variant="caption" color="muted" style={{ marginLeft: 4 }}>
                            {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {s.duration_minutes} min
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm }}>
                    {s.status === 'LIVE' && (
                      <TouchableOpacity
                        onPress={() => router.push(`/live/${s.id}`)}
                        activeOpacity={0.7}
                        style={[styles.actionBtn, { backgroundColor: colors.error }]}
                      >
                        <Ionicons name="radio" size={14} color="#fff" />
                        <ThemedText variant="label" bold style={{ color: '#fff', marginLeft: 4 }}>Enter Room</ThemedText>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => openEdit(s)}
                      activeOpacity={0.7}
                      style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.text} />
                      <ThemedText variant="label" bold style={{ color: colors.text, marginLeft: 4 }}>Edit Details</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ThemedView>
        )}
      </ScrollView>

      <Modal visible={dialogVisible} transparent animationType="slide" onRequestClose={() => setDialogVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl }}>
              <View>
                <ThemedText variant="h3" bold>{editingId ? 'Edit Session' : 'New Session'}</ThemedText>
                <ThemedText variant="caption" color="secondary">Connect the session to one of your courses.</ThemedText>
              </View>
              <TouchableOpacity onPress={() => setDialogVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ThemedText variant="caption" color="secondary" style={{ marginBottom: Spacing.xs }}>Course</ThemedText>
            <TouchableOpacity
              onPress={() => setShowCoursePicker(true)}
              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <ThemedText variant="body" color={form.course ? undefined : 'muted'} style={{ flex: 1 }} numberOfLines={1}>
                {courses.find((c) => c.id === form.course)?.title || 'Select a course'}
              </ThemedText>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>Title</ThemedText>
            <TextInput
              value={form.title}
              onChangeText={(t) => setForm((prev) => ({ ...prev, title: t }))}
              placeholder="Session title"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>Date & Time</ThemedText>
            <TextInput
              value={form.scheduled_at}
              onChangeText={(t) => setForm((prev) => ({ ...prev, scheduled_at: t }))}
              placeholder="YYYY-MM-DDTHH:mm"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="caption" color="secondary" style={{ marginBottom: Spacing.xs }}>Duration (min)</ThemedText>
                <TextInput
                  value={String(form.duration_minutes)}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, duration_minutes: Number(t) || 60 }))}
                  keyboardType="number-pad"
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="caption" color="secondary" style={{ marginBottom: Spacing.xs }}>Status</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowStatusPicker(true)}
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: colors.border, backgroundColor: colors.background }]}
                >
                  <ThemedText variant="body">{form.status}</ThemedText>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing['2xl'] }}>
              <TouchableOpacity
                onPress={() => { setDialogVisible(false); setEditingId(null); }}
                activeOpacity={0.7}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <ThemedText variant="body" color="secondary">Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submit}
                disabled={saving || !form.course || !form.title.trim() || !form.scheduled_at}
                activeOpacity={0.7}
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (saving || !form.course || !form.title.trim() || !form.scheduled_at) ? 0.5 : 1 }]}
              >
                <Ionicons name={editingId ? 'save-outline' : 'add-circle-outline'} size={18} color="#fff" />
                <ThemedText variant="body" bold style={{ color: '#fff', marginLeft: Spacing.sm }}>
                  {saving ? 'Saving...' : editingId ? 'Save Session' : 'Schedule Session'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                    onPress={() => { setForm((prev) => ({ ...prev, course: c.id })); setShowCoursePicker(false); }}
                    style={{
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.md,
                      borderRadius: BorderRadius.lg,
                      backgroundColor: form.course === c.id ? colors.primaryLight : 'transparent',
                      marginBottom: Spacing.xs,
                    }}
                  >
                    <ThemedText variant="body" bold={form.course === c.id}>{c.title}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={StyleSheet.absoluteFill} pointerEvents={showStatusPicker ? 'auto' : 'none'}>
        {showStatusPicker && (
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: Spacing['2xl'] }}
            activeOpacity={1}
            onPress={() => setShowStatusPicker(false)}
          >
            <View style={{ backgroundColor: colors.surface, borderRadius: BorderRadius['2xl'], padding: Spacing.xl }}>
              <ThemedText variant="body" bold style={{ marginBottom: Spacing.md }}>Select Status</ThemedText>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { setForm((prev) => ({ ...prev, status: opt.value })); setShowStatusPicker(false); }}
                  style={{
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing.md,
                    borderRadius: BorderRadius.lg,
                    backgroundColor: form.status === opt.value ? colors.primaryLight : 'transparent',
                    marginBottom: Spacing.xs,
                  }}
                >
                  <ThemedText variant="body" bold={form.status === opt.value}>{opt.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: FontSize.base,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionItem: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'],
    maxHeight: '90%',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: FontSize.base,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
