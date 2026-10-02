import { useEffect, useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Modal, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAlert } from '../../src/components/AlertDialog';
import { courseService } from '../../src/services/courses';
import {
  universityService,
  type AttendanceRecord,
  type AttendanceStatus,
  type CourseGradesSummary,
  type CourseTranscript,
  type Evaluation,
  type StudentGradeRow,
  type UniversitySession,
} from '../../src/services/universityService';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

const TYPE_LABELS: Record<string, string> = { CM: 'CM', TD: 'TD', TP: 'TP' };
const STATUS_ORDER: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];
const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  PRESENT: { label: 'Présent', color: '#16A34A', bg: '#DCFCE7' },
  LATE: { label: 'Retard', color: '#D97706', bg: '#FEF3C7' },
  ABSENT: { label: 'Absent', color: '#DC2626', bg: '#FEE2E2' },
  EXCUSED: { label: 'Excusé', color: '#0284C7', bg: '#E0F2FE' },
};

const KIND_LABELS: Record<string, string> = { CONTINUOUS: 'Contrôle continu', EXAM: 'Examen', ORAL: 'Oral' };
const DECISIONS_1: { value: string; label: string; color: string }[] = [
  { value: 'ADMIS', label: 'Admis', color: '#16A34A' },
  { value: 'COMPENSE', label: 'Compensé', color: '#0284C7' },
  { value: 'RATTRAPAGE', label: 'Rattrapage', color: '#D97706' },
  { value: 'REFUSE', label: 'Refusé', color: '#DC2626' },
];
const DECISIONS_2: { value: string; label: string; color: string }[] = [
  { value: 'ADMIS', label: 'Admis', color: '#16A34A' },
  { value: 'COMPENSE', label: 'Compensé', color: '#0284C7' },
  { value: 'REFUSE', label: 'Refusé', color: '#DC2626' },
];

export default function InstructorSuiviScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { alert, confirm } = useAlert();

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [courseId, setCourseId] = useState('');
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'seances' | 'notes' | 'deliberation' | 'releve'>('seances');

  const [sessions, setSessions] = useState<UniversitySession[]>([]);
  const [attendanceBySession, setAttendanceBySession] = useState<Record<string, AttendanceRecord[]>>({});
  const [pendingFlags, setPendingFlags] = useState<Record<string, Record<string, string>>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({});

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [summary, setSummary] = useState<CourseGradesSummary | null>(null);
  const [transcript, setTranscript] = useState<CourseTranscript | null>(null);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDraft, setSessionDraft] = useState({ session_type: 'CM', title: '', date: '', start_time: '', end_time: '', location: '' });
  const [savingSession, setSavingSession] = useState(false);

  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalDraft, setEvalDraft] = useState({ kind: 'CONTINUOUS', title: '', coefficient: '1' });
  const [savingEval, setSavingEval] = useState(false);

  const [decidingRow, setDecidingRow] = useState<StudentGradeRow | null>(null);
  const [decidingAttempt, setDecidingAttempt] = useState<1 | 2>(1);
  const [savingDecision, setSavingDecision] = useState(false);

  const [busySession, setBusySession] = useState<string | null>(null);

  const loadCourseData = async (cid: string) => {
    const [sessionList, evalList, gradeSummary, courseTranscript] = await Promise.all([
      universityService.listUniversitySessions(cid).catch(() => []),
      universityService.listEvaluations(cid).catch(() => []),
      universityService.getCourseGradesSummary(cid).catch(() => null),
      universityService.getCourseTranscript(cid).catch(() => null),
    ]);
    setSessions(sessionList);
    setEvaluations(evalList);
    setSummary(gradeSummary);
    setTranscript(courseTranscript);
    await loadAllAttendance(sessionList);
  };

  const loadAllAttendance = async (sessionList: UniversitySession[]) => {
    if (sessionList.length === 0) {
      setAttendanceBySession({});
      setPendingFlags({});
      return;
    }
    const entries: [string, AttendanceRecord[]][] = await Promise.all(
      sessionList.map(async (s): Promise<[string, AttendanceRecord[]]> => {
        try {
          return [s.id, await universityService.listSessionAttendance(s.id)];
        } catch {
          return [s.id, []];
        }
      }),
    );
    const attendance: Record<string, AttendanceRecord[]> = {};
    const flags: Record<string, Record<string, string>> = {};
    entries.forEach(([sid, recs]) => {
      attendance[sid] = recs;
      flags[sid] = {};
      recs.forEach((r) => {
        if (r.justification_status === 'PENDING') flags[sid][r.id] = r.student_name || 'Étudiant';
      });
    });
    setAttendanceBySession(attendance);
    setPendingFlags(flags);
  };

  const refresh = async (asRefresh = false) => {
    if (!user?.id) return;
    if (asRefresh) setRefreshing(true);
    try {
      const courseData = await courseService.listCourses({ instructor: user.id });
      const list = (courseData.results ?? []).map((c) => ({ id: c.id, title: c.title }));
      setCourses(list);
      const cid = courseId || list[0]?.id || '';
      setCourseId(cid);
      if (cid) await loadCourseData(cid);
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de charger le suivi.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const onSelectCourse = (cid: string) => {
    setCourseId(cid);
    setSessions([]);
    setAttendanceBySession({});
    setPendingFlags({});
    setShowCoursePicker(false);
    setLoading(true);
    loadCourseData(cid).finally(() => setLoading(false));
  };

  const selectStatus = (sessionId: string, record: AttendanceRecord, status: AttendanceStatus) => {
    setEditingAttendance((prev) => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || {}), [record.id]: status },
    }));
  };

  const toggleStatus = (sessionId: string, record: AttendanceRecord) => {
    const current = editingAttendance[sessionId]?.[record.id] || record.status;
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    selectStatus(sessionId, record, next);
  };

  const saveAttendance = async (sessionId: string) => {
    const edits = editingAttendance[sessionId];
    if (!edits) return;
    const payload = Object.entries(edits).map(([recordId, status]) => {
      const record = attendanceBySession[sessionId]?.find((r) => r.id === recordId);
      return { student_id: record?.student || '', status };
    });
    setBusySession(sessionId);
    try {
      const updated = await universityService.markSessionAttendance(sessionId, payload);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, student_count: updated } : s)));
      const fresh = await universityService.listSessionAttendance(sessionId);
      setAttendanceBySession((prev) => ({ ...prev, [sessionId]: fresh }));
      setEditingAttendance((prev) => ({ ...prev, [sessionId]: {} }));
      setExpandedSession(null);
      await alert({ title: 'Enregistré', message: `${updated} statut(s) mis à jour.` });
      await loadCourseData(courseId);
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible d\u2019enregistrer l\u2019assiduité.' });
    } finally {
      setBusySession(null);
    }
  };

  const reviewJustification = async (record: AttendanceRecord, decision: 'APPROVE' | 'REJECT') => {
    try {
      const updated = await universityService.reviewJustification(record.id, decision);
      const sessionId = record.session;
      setAttendanceBySession((prev) => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).map((r) => (r.id === updated.id ? updated : r)),
      }));
      setPendingFlags((prev) => {
        const sessionFlags = { ...(prev[sessionId] || {}) };
        delete sessionFlags[record.id];
        return { ...prev, [sessionId]: sessionFlags };
      });
      await alert({
        title: 'Traité',
        message: decision === 'APPROVE' ? 'Absence excusée.' : 'Justification refusée.',
      });
      loadCourseData(courseId);
    } catch {
      await alert({ title: 'Erreur', message: 'Action impossible.' });
    }
  };

  const createSession = async () => {
    if (!courseId || !sessionDraft.date || !sessionDraft.start_time || !sessionDraft.end_time) {
      await alert({ title: 'Champs requis', message: 'Date et horaires sont obligatoires.' });
      return;
    }
    setSavingSession(true);
    try {
      await universityService.createUniversitySession({
        course: courseId,
        session_type: sessionDraft.session_type as 'CM' | 'TD' | 'TP',
        title: sessionDraft.title || undefined,
        date: sessionDraft.date,
        start_time: sessionDraft.start_time,
        end_time: sessionDraft.end_time,
        location: sessionDraft.location || undefined,
      });
      setShowSessionModal(false);
      setSessionDraft({ session_type: 'CM', title: '', date: '', start_time: '', end_time: '', location: '' });
      await loadCourseData(courseId);
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de planifier la séance.' });
    } finally {
      setSavingSession(false);
    }
  };

  const deleteSession = async (session: UniversitySession) => {
    const ok = await confirm({ title: 'Supprimer ?', message: `Supprimer la séance ${session.title || TYPE_LABELS[session.session_type]} du ${session.date} ?` });
    if (!ok) return;
    try {
      await universityService.deleteUniversitySession(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de supprimer.' });
    }
  };

  const createEvaluation = async () => {
    if (!courseId || !evalDraft.title.trim()) {
      await alert({ title: 'Titre requis', message: 'Le titre de l\u2019évaluation est obligatoire.' });
      return;
    }
    setSavingEval(true);
    try {
      await universityService.createEvaluation({
        course: courseId,
        kind: evalDraft.kind as 'CONTINUOUS' | 'EXAM' | 'ORAL',
        title: evalDraft.title.trim(),
        coefficient: Math.max(0, parseFloat(evalDraft.coefficient) || 1),
      });
      setShowEvalModal(false);
      setEvalDraft({ kind: 'CONTINUOUS', title: '', coefficient: '1' });
      await loadCourseData(courseId);
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de créer l\u2019évaluation.' });
    } finally {
      setSavingEval(false);
    }
  };

  const deleteEvaluation = async (evaluation: Evaluation) => {
    const ok = await confirm({ title: 'Supprimer ?', message: `Supprimer l\u2019évaluation « ${evaluation.title} » ?` });
    if (!ok) return;
    try {
      await universityService.deleteEvaluation(evaluation.id);
      setEvaluations((prev) => prev.filter((e) => e.id !== evaluation.id));
      loadCourseData(courseId);
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de supprimer.' });
    }
  };

  const decideGrade = async (decision: string) => {
    if (!decidingRow || !courseId) return;
    setSavingDecision(true);
    try {
      await universityService.decideCourseGrade(courseId, {
        enrollment_id: decidingRow.enrollment_id,
        attempt: decidingAttempt,
        decision,
      });
      setDecidingRow(null);
      await loadCourseData(courseId);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ||
        (err?.response?.data && typeof err.response.data === 'object' ? Object.values(err.response.data) : []).flat().join(' ') ||
        'Décision impossible à appliquer.';
      await alert({ title: 'Refusée', message: detail });
    } finally {
      setSavingDecision(false);
    }
  };

  const allPendingCount = useMemo(
    () => Object.values(pendingFlags).reduce((sum, dict) => sum + Object.keys(dict).length, 0),
    [pendingFlags],
  );

  const decisionColor = (d: string) =>
    d === 'ADMIS' ? colors.success : d === 'COMPENSE' ? colors.info : d === 'RATTRAPAGE' ? colors.warning : colors.error;

  if (loading && courses.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: Spacing.xl }}>
          <SkeletonLoader height={30} rounded="lg" width="70%" />
          <SkeletonLoader height={80} rounded="lg" style={{ marginTop: Spacing.lg }} />
          <SkeletonLoader height={100} rounded="lg" style={{ marginTop: Spacing.md }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowCoursePicker(true)} style={{ flex: 1, marginLeft: Spacing.md }}>
          <ThemedText variant="body" bold style={{ fontSize: 15 }}>
            {courses.find((c) => c.id === courseId)?.title || 'Choisir un cours'}
          </ThemedText>
          <ThemedText variant="label" color="muted">Suivi universitaire</ThemedText>
        </TouchableOpacity>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </View>

      {courseId ? (
        <>
          <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              <TouchableOpacity
                style={[styles.tabPill, tab === 'seances' && { backgroundColor: colors.primary }]}
                onPress={() => setTab('seances')}
              >
                <ThemedText variant="label" style={{ color: tab === 'seances' ? '#fff' : colors.textSecondary }}>
                  Séances ({sessions.length})
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, tab === 'notes' && { backgroundColor: colors.primary }]}
                onPress={() => setTab('notes')}
              >
                <ThemedText variant="label" style={{ color: tab === 'notes' ? '#fff' : colors.textSecondary }}>
                  Évaluations
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, tab === 'deliberation' && { backgroundColor: colors.primary }]}
                onPress={() => setTab('deliberation')}
              >
                <ThemedText variant="label" style={{ color: tab === 'deliberation' ? '#fff' : colors.textSecondary }}>
                  Délibération
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, tab === 'releve' && { backgroundColor: colors.primary }]}
                onPress={() => setTab('releve')}
              >
                <ThemedText variant="label" style={{ color: tab === 'releve' ? '#fff' : colors.textSecondary }}>
                  Relevé
                </ThemedText>
              </TouchableOpacity>
            </View>
            {allPendingCount > 0 && (
              <TouchableOpacity onPress={() => setTab('seances')}>
                <ThemedText variant="label" style={{ color: colors.warning, marginTop: Spacing.sm }}>
                  ⚠ {allPendingCount} justification{allPendingCount > 1 ? 's' : ''} en attente
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing['6xl'] }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} />}
          >
            {tab === 'seances' && (
              <>
                <TouchableOpacity
                  onPress={() => setShowSessionModal(true)}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Planifier une séance</ThemedText>
                </TouchableOpacity>

                {sessions.length === 0 ? (
                  <ThemedView variant="card" rounded="xl" style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing.lg }}>
                    <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                    <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
                      Aucune séance. Planifiez un CM, TD ou TP.
                    </ThemedText>
                  </ThemedView>
                ) : (
                  sessions.map((session) => {
                    const recs = attendanceBySession[session.id] || [];
                    const pendingHere = Object.keys(pendingFlags[session.id] || {});
                    const isExpanded = expandedSession === session.id;
                    return (
                      <ThemedView key={session.id} variant="card" rounded="xl" elevated style={{ marginTop: Spacing.md }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                                <ThemedText variant="label" style={{ color: colors.primary }}>{TYPE_LABELS[session.session_type]}</ThemedText>
                              </View>
                              {session.is_cancelled && (
                                <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
                                  <ThemedText variant="label" color="secondary">Annulée</ThemedText>
                                </View>
                              )}
                              <ThemedText variant="caption" color="muted" style={{ marginLeft: Spacing.sm }}>
                                {session.date} · {session.start_time}–{session.end_time}
                              </ThemedText>
                            </View>
                            <ThemedText variant="body" bold style={{ marginTop: 4 }}>
                              {session.title || `${session.session_type} ${session.date}`}
                            </ThemedText>
                            <ThemedText variant="caption" color="muted">{session.location || ''}</ThemedText>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <TouchableOpacity onPress={() => setExpandedSession(isExpanded ? null : session.id)}>
                              <ThemedText variant="label" style={{ color: colors.primary }}>
                                {isExpanded ? 'Fermer' : 'Assiduité'}
                              </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteSession(session)} style={{ marginTop: Spacing.sm }}>
                              <Ionicons name="trash-outline" size={16} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {pendingHere.length > 0 && (
                          <View style={{ marginTop: Spacing.md }}>
                            <ThemedText variant="label" style={{ color: colors.warning }}>Justifications en attente :</ThemedText>
                            {recs
                              .filter((r) => r.justification_status === 'PENDING')
                              .map((r) => (
                                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm }}>
                                  <View style={{ flex: 1 }}>
                                    <ThemedText variant="body" bold>{r.student_name}</ThemedText>
                                    <ThemedText variant="caption" color="secondary">{r.justification}</ThemedText>
                                  </View>
                                  <TouchableOpacity onPress={() => reviewJustification(r, 'APPROVE')} style={{ marginLeft: Spacing.sm }}>
                                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => reviewJustification(r, 'REJECT')} style={{ marginLeft: Spacing.sm }}>
                                    <Ionicons name="close-circle" size={24} color={colors.error} />
                                  </TouchableOpacity>
                                </View>
                              ))}
                          </View>
                        )}

                        {isExpanded && (
                          <View style={{ marginTop: Spacing.md }}>
                            {recs.map((r, idx) => {
                              const current = editingAttendance[session.id]?.[r.id] || r.status;
                              const meta = STATUS_META[current];
                              return (
                                <View
                                  key={r.id}
                                  style={[
                                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                                    idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border + '44', marginTop: Spacing.sm, paddingTop: Spacing.sm },
                                  ]}
                                >
                                  <View style={{ flex: 1 }}>
                                    <ThemedText variant="body" bold>{r.student_name}</ThemedText>
                                    {r.justification_status === 'PENDING' && (
                                      <ThemedText variant="caption" style={{ color: colors.warning }}>Justif. en attente</ThemedText>
                                    )}
                                  </View>
                                  <TouchableOpacity onPress={() => toggleStatus(session.id, r)} style={{ marginLeft: Spacing.sm }}>
                                    <ThemedText variant="label" style={{ color: meta.color }}>{meta.label}</ThemedText>
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                            <TouchableOpacity
                              onPress={() => saveAttendance(session.id)}
                              disabled={busySession === session.id}
                              style={[{
                                backgroundColor: colors.primary, padding: Spacing.md, borderRadius: BorderRadius.full,
                                alignItems: 'center', marginTop: Spacing.md, opacity: busySession === session.id ? 0.5 : 1,
                              }]}
                            >
                              {busySession === session.id ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <ThemedText bold style={{ color: '#fff' }}>Enregistrer l&apos;assiduité</ThemedText>
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </ThemedView>
                    );
                  })
                )}
              </>
            )}

            {tab === 'notes' && (
              <>
                <TouchableOpacity
                  onPress={() => setShowEvalModal(true)}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Nouvelle évaluation</ThemedText>
                </TouchableOpacity>

                {evaluations.length === 0 ? (
                  <ThemedView variant="card" rounded="xl" style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing.lg }}>
                    <Ionicons name="flask-outline" size={36} color={colors.textMuted} />
                    <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
                      Aucune évaluation. Les notes automatiques (quiz/devoirs) apparaîtront ici.
                    </ThemedText>
                  </ThemedView>
                ) : (
                  evaluations.map((evaluation) => (
                    <ThemedView key={evaluation.id} variant="card" rounded="xl" elevated style={{ marginTop: Spacing.md }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="body" bold>{evaluation.title}</ThemedText>
                          <ThemedText variant="caption" color="muted">
                            {KIND_LABELS[evaluation.kind] || evaluation.kind} · coef {Number(evaluation.coefficient).toLocaleString('fr-FR')}
                            {evaluation.date ? ` · ${evaluation.date}` : ''}
                          </ThemedText>
                          {evaluation.source ? <ThemedText variant="caption" color="secondary">{evaluation.source}</ThemedText> : null}
                        </View>
                        <TouchableOpacity onPress={() => deleteEvaluation(evaluation)} style={{ marginLeft: Spacing.md }}>
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </ThemedView>
                  ))
                )}
              </>
            )}

            {tab === 'deliberation' && (
              <>
                {summary && summary.course.credits > 0 && (
                  <ThemedText variant="caption" color="muted" style={{ marginBottom: Spacing.sm }}>
                    Chaque UE validée (Admis / Compensé) octroie {summary.course.credits} ECTS.
                  </ThemedText>
                )}
                {!summary || summary.students.length === 0 ? (
                  <ThemedView variant="card" rounded="xl" style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing.lg }}>
                    <Ionicons name="people-outline" size={36} color={colors.textMuted} />
                    <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
                      Aucun étudiant inscrit.
                    </ThemedText>
                  </ThemedView>
                ) : (
                  summary.students.map((row) => (
                    <ThemedView key={row.enrollment_id} variant="card" rounded="xl" elevated style={{ marginTop: Spacing.md }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="body" bold>{row.student_name}</ThemedText>
                          <ThemedText variant="caption" color="muted">
                            Assiduité {row.attendance_rate != null ? `${row.attendance_rate}%` : '—'}
                          </ThemedText>
                          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm }}>
                            <View>
                              <ThemedText variant="caption" color="muted">S1</ThemedText>
                              <ThemedText variant="body" bold style={{ color: decisionColor(row.session_1.decision) }}>
                                {row.session_1.average != null ? `${row.session_1.average.toFixed(2)}` : '—'} · {row.session_1.decision_display}
                              </ThemedText>
                            </View>
                            <View>
                              <ThemedText variant="caption" color="muted">S2</ThemedText>
                              <ThemedText variant="body" bold style={{ color: decisionColor(row.session_2.decision) }}>
                                {row.session_2.average != null ? `${row.session_2.average.toFixed(2)}` : '—'} · {row.session_2.decision_display}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => { setDecidingRow(row); setDecidingAttempt(1); }}>
                          <View style={{ backgroundColor: colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full }}>
                            <ThemedText variant="label" style={{ color: colors.primary }}>Délibérer</ThemedText>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </ThemedView>
                  ))
                )}
              </>
            )}

            {tab === 'releve' && (
              <>
                {transcript && transcript.rows.length > 0 ? (
                  <>
                    <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg }}>
                      <ThemedText variant="body" bold style={{ fontSize: 16 }}>{transcript.course.title}</ThemedText>
                      <ThemedText variant="caption" color="muted">
                        {transcript.course.instructor_name}
                        {transcript.course.credits ? ` · ${transcript.course.credits} ECTS` : ''}
                        {transcript.course.start_date ? ` · ${transcript.course.start_date} → ${transcript.course.end_date || ''}` : ''}
                      </ThemedText>
                    </ThemedView>
                    {transcript.rows.map((row) => (
                      <ThemedView key={row.enrollment_id} variant="card" rounded="xl" elevated style={{ marginTop: Spacing.md }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <ThemedText variant="body" bold>{row.student.full_name}</ThemedText>
                            <ThemedText variant="caption" color="muted">
                              Assiduité {row.attendance_rate != null ? `${row.attendance_rate}%` : '—'} · {row.credits_earned} ECTS
                            </ThemedText>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm }}>
                              {row.evaluations.map((ev) => (
                                <View key={ev.id} style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
                                  <ThemedText variant="label" color="secondary">
                                    {ev.title} {ev.has_grade && ev.note != null ? `${ev.note.toFixed(2)}` : '—'}
                                  </ThemedText>
                                </View>
                              ))}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <ThemedText variant="body" bold style={{ color: decisionColor(row.final.decision) }}>
                              {row.final.average != null ? `${row.final.average.toFixed(2)}/20` : '—'}
                            </ThemedText>
                            <ThemedText variant="label" style={{ color: decisionColor(row.final.decision) }}>
                              {row.final.decision_display}
                            </ThemedText>
                          </View>
                        </View>
                      </ThemedView>
                    ))}
                  </>
                ) : (
                  <ThemedView variant="card" rounded="xl" style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing.lg }}>
                    <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
                    <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
                      Relevé indisponible tant qu'aucun étudiant n'est délibéré.
                    </ThemedText>
                  </ThemedView>
                )}
              </>
            )}
          </ScrollView>
        </>
      ) : (
        <View style={{ padding: Spacing.xl }}>
          <ThemedText variant="body" color="secondary">Aucun cours associé à votre compte.</ThemedText>
        </View>
      )}

      {/* Course picker */}
      <Modal visible={showCoursePicker} transparent animationType="fade" onRequestClose={() => setShowCoursePicker(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowCoursePicker(false)}>
          <ThemedView variant="card" rounded="xl" elevated style={styles.pickerSheet}>
            <ThemedText variant="h3" bold>Choisir un cours</ThemedText>
            {courses.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => onSelectCourse(c.id)} style={{ marginTop: Spacing.md }}>
                <ThemedText variant="body" bold={c.id === courseId} style={{ color: c.id === courseId ? colors.primary : colors.text }}>
                  {c.title}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </TouchableOpacity>
      </Modal>

      {/* New session */}
      <Modal visible={showSessionModal} transparent animationType="slide" onRequestClose={() => setShowSessionModal(false)}>
        <View style={[styles.backdrop, styles.centered]}>
          <ThemedView variant="card" rounded="xl" elevated style={styles.sheet}>
            <ThemedText variant="h3" bold>Planifier une séance</ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
              {['CM', 'TD', 'TP'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSessionDraft((d) => ({ ...d, session_type: t }))}
                  style={[styles.kindPill, sessionDraft.session_type === t && { backgroundColor: colors.primary }]}
                >
                  <ThemedText variant="label" style={{ color: sessionDraft.session_type === t ? '#fff' : colors.textSecondary }}>{t}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Titre (optionnel)" value={sessionDraft.title} onChangeText={(v) => setSessionDraft((d) => ({ ...d, title: v }))} placeholder="Ex : Chapitre 3" colors={colors} />
            <Field label="Date (AAAA-MM-JJ)" value={sessionDraft.date} onChangeText={(v) => setSessionDraft((d) => ({ ...d, date: v }))} placeholder="2026-09-20" colors={colors} />
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label="Début (HH:MM)" value={sessionDraft.start_time} onChangeText={(v) => setSessionDraft((d) => ({ ...d, start_time: v }))} placeholder="08:00" colors={colors} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Fin (HH:MM)" value={sessionDraft.end_time} onChangeText={(v) => setSessionDraft((d) => ({ ...d, end_time: v }))} placeholder="10:00" colors={colors} />
              </View>
            </View>
            <Field label="Lieu (optionnel)" value={sessionDraft.location} onChangeText={(v) => setSessionDraft((d) => ({ ...d, location: v }))} placeholder="Salle B12" colors={colors} />
            <TouchableOpacity
              onPress={createSession}
              disabled={savingSession}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg, opacity: savingSession ? 0.5 : 1 }]}
            >
              {savingSession ? <ActivityIndicator color="#fff" /> : <ThemedText bold style={{ color: '#fff' }}>Créer la séance</ThemedText>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSessionModal(false)} style={{ marginTop: Spacing.md, alignItems: 'center' }}>
              <ThemedText variant="label" color="secondary">Annuler</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* New evaluation */}
      <Modal visible={showEvalModal} transparent animationType="slide" onRequestClose={() => setShowEvalModal(false)}>
        <View style={[styles.backdrop, styles.centered]}>
          <ThemedView variant="card" rounded="xl" elevated style={styles.sheet}>
            <ThemedText variant="h3" bold>Nouvelle évaluation</ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
              {['CONTINUOUS', 'EXAM', 'ORAL'].map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setEvalDraft((d) => ({ ...d, kind: k }))}
                  style={[styles.kindPill, evalDraft.kind === k && { backgroundColor: colors.primary }]}
                >
                  <ThemedText variant="label" style={{ color: evalDraft.kind === k ? '#fff' : colors.textSecondary }}>
                    {KIND_LABELS[k]}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Titre" value={evalDraft.title} onChangeText={(v) => setEvalDraft((d) => ({ ...d, title: v }))} placeholder="Ex : Partiel de mi-parcours" colors={colors} />
            <Field label="Coefficient" value={evalDraft.coefficient} onChangeText={(v) => setEvalDraft((d) => ({ ...d, coefficient: v }))} placeholder="1" colors={colors} keyboardType="decimal-pad" />
            <TouchableOpacity
              onPress={createEvaluation}
              disabled={savingEval}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg, opacity: savingEval ? 0.5 : 1 }]}
            >
              {savingEval ? <ActivityIndicator color="#fff" /> : <ThemedText bold style={{ color: '#fff' }}>Créer l&apos;évaluation</ThemedText>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEvalModal(false)} style={{ marginTop: Spacing.md, alignItems: 'center' }}>
              <ThemedText variant="label" color="secondary">Annuler</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Decide */}
      <Modal visible={!!decidingRow} transparent animationType="slide" onRequestClose={() => setDecidingRow(null)}>
        <View style={[styles.backdrop, styles.centered]}>
          {decidingRow && (
            <ThemedView variant="card" rounded="xl" elevated style={styles.sheet}>
              <ThemedText variant="h3" bold>Délibération</ThemedText>
              <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
                {decidingRow.student_name} · moyenne S{decidingAttempt} :{' '}
                {(decidingAttempt === 1 ? decidingRow.session_1.average : decidingRow.session_2.average)?.toFixed(2) ?? '—'}/20
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                {[1, 2].map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setDecidingAttempt(a as 1 | 2)}
                    style={[styles.kindPill, decidingAttempt === a && { backgroundColor: colors.primary }]}
                  >
                    <ThemedText variant="label" style={{ color: decidingAttempt === a ? '#fff' : colors.textSecondary }}>Session {a}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {(decidingAttempt === 1 ? DECISIONS_1 : DECISIONS_2).map((d) => (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => decideGrade(d.value)}
                  disabled={savingDecision}
                  style={[{
                    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
                    borderRadius: BorderRadius.lg, marginTop: Spacing.md, borderWidth: 1, borderColor: colors.border,
                    opacity: savingDecision ? 0.5 : 1,
                  }]}
                >
                  <View style={[styles.badge, { backgroundColor: d.color + '22', paddingHorizontal: Spacing.md }]}>
                    <ThemedText variant="label" style={{ color: d.color }}>{d.label}</ThemedText>
                  </View>
                  <ThemedText variant="label" color="muted" style={{ marginLeft: Spacing.md }}>crédits attribués si validé</ThemedText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setDecidingRow(null)} style={{ marginTop: Spacing.md, alignItems: 'center' }}>
                <ThemedText variant="label" color="secondary">Annuler</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label, value, onChangeText, placeholder, colors, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  colors: Record<string, string>; keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={{ marginTop: Spacing.md }}>
      <ThemedText variant="label" color="muted">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text + '66'}
        keyboardType={keyboardType}
        style={{
          borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: Spacing.md,
          color: colors.text, backgroundColor: colors.background, marginTop: 6, fontSize: 15,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  tabPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'transparent',
  },
  primaryBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  centered: {
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  pickerSheet: {
    padding: Spacing.xl,
    margin: Spacing.lg,
    marginBottom: Spacing['5xl'],
  },
  sheet: {
    padding: Spacing.xl,
    maxHeight: '85%',
  },
  kindPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
});