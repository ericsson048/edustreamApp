import { useEffect, useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAlert } from '../../src/components/AlertDialog';
import { courseService, type Course } from '../../src/services/courses';
import {
  universityService,
  type AttendanceRecord,
  type AttendanceStatus,
  type CourseGradesSummary,
  type CourseTranscript,
  type StudentGradeRow,
  type UniversitySession,
} from '../../src/services/universityService';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

const TYPE_LABELS: Record<string, string> = {
  CM: 'Cours magistral',
  TD: 'Travaux dirigés',
  TP: 'Travaux pratiques',
};

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  PRESENT: { label: 'Présent', color: '#16A34A', bg: '#DCFCE7' },
  LATE: { label: 'Retard', color: '#D97706', bg: '#FEF3C7' },
  ABSENT: { label: 'Absent', color: '#DC2626', bg: '#FEE2E2' },
  EXCUSED: { label: 'Excusé', color: '#0284C7', bg: '#E0F2FE' },
};

export default function CourseSuiviScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAlert();

  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<UniversitySession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<CourseGradesSummary | null>(null);
  const [transcript, setTranscript] = useState<CourseTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'assiduite' | 'notes'>('assiduite');
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async (asRefresh = false) => {
    if (!id) return;
    if (asRefresh) setRefreshing(true);
    try {
      const [c, sessionList, recordList, gradeSummary, courseTranscript] = await Promise.all([
        courseService.getCourse(id).catch(() => null),
        universityService.listUniversitySessions(id).catch(() => []),
        universityService.listAttendanceRecords().catch(() => []),
        universityService.getCourseGradesSummary(id).catch(() => null),
        universityService.getCourseTranscript(id).catch(() => null),
      ]);
      setCourse(c);
      setSessions(sessionList);
      setRecords(recordList);
      setSummary(gradeSummary);
      setTranscript(courseTranscript);
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de charger le suivi.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const myRow: StudentGradeRow | null | undefined = useMemo(() => {
    if (!summary) return undefined;
    return summary.students[0] ?? null;
  }, [summary]);

  const recordBySession = useMemo(() => new Map(records.map((r) => [r.session, r])), [records]);

  const justifyAbsence = async (record: AttendanceRecord) => {
    if (!justificationText.trim()) {
      await alert({ title: 'Justification', message: 'Veuillez saisir une justification.' });
      return;
    }
    setSubmitting(true);
    try {
      const updated = await universityService.justifyAbsence(record.id, justificationText.trim());
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setJustifyingId(null);
      setJustificationText('');
      await alert({ title: 'Envoyée', message: 'Justification envoyée. En attente de validation par votre professeur.' });
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible d\u2019envoyer la justification.' });
    } finally {
      setSubmitting(false);
    }
  };

  const decisionBadge = (decision: string, display: string) => {
    const color =
      decision === 'ADMIS' ? '#16A34A' : decision === 'COMPENSE' ? '#0284C7' : decision === 'RATTRAPAGE' ? '#D97706' : '#DC2626';
    const bg =
      decision === 'ADMIS' ? '#DCFCE7' : decision === 'COMPENSE' ? '#E0F2FE' : decision === 'RATTRAPAGE' ? '#FEF3C7' : '#FEE2E2';
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <ThemedText variant="label" style={{ color }}>{display}</ThemedText>
      </View>
    );
  };

  if (loading) {
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
        <ThemedText variant="body" bold style={{ flex: 1, marginLeft: Spacing.md, fontSize: 16 }}>
          Mon suivi universitaire
        </ThemedText>
      </View>

      <View style={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <ThemedText variant="h2" bold>{course?.title || 'Suivi universitaire'}</ThemedText>
        {course?.credits ? (
          <ThemedText variant="label" style={{ color: colors.info, marginTop: 4 }}>
            {course.credits} crédit{course.credits > 1 ? 's' : ''} ECTS
          </ThemedText>
        ) : null}

        <View style={[styles.tabRow, { backgroundColor: colors.surfaceSecondary, borderRadius: BorderRadius.full, marginTop: Spacing.md }]}>
          <TouchableOpacity
            onPress={() => setTab('assiduite')}
            style={[styles.tab, tab === 'assiduite' && { backgroundColor: colors.primary }]}
          >
            <Ionicons name="calendar-outline" size={15} color={tab === 'assiduite' ? '#fff' : colors.textSecondary} />
            <ThemedText
              variant="label"
              style={{ color: tab === 'assiduite' ? '#fff' : colors.textSecondary, marginLeft: 4 }}
            >
              Séances
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('notes')}
            style={[styles.tab, tab === 'notes' && { backgroundColor: colors.primary }]}
          >
            <Ionicons name="clipboard-outline" size={15} color={tab === 'notes' ? '#fff' : colors.textSecondary} />
            <ThemedText
              variant="label"
              style={{ color: tab === 'notes' ? '#fff' : colors.textSecondary, marginLeft: 4 }}
            >
              Notes & Relevé
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {tab === 'assiduite' ? (
          <>
            {myRow && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg }}>
                <ThemedView variant="card" rounded="lg" elevated style={styles.stat}>
                  <ThemedText variant="caption" color="muted">Présence</ThemedText>
                  <ThemedText variant="h3" bold style={{ color: colors.success }}>
                    {myRow.attendance_rate != null ? `${myRow.attendance_rate}%` : '—'}
                  </ThemedText>
                </ThemedView>
                <ThemedView variant="card" rounded="lg" elevated style={styles.stat}>
                  <ThemedText variant="caption" color="muted">Abs. non justifiées</ThemedText>
                  <ThemedText variant="h3" bold style={{ color: colors.error }}>{myRow.attendance.absent}</ThemedText>
                </ThemedView>
                <ThemedView variant="card" rounded="lg" elevated style={styles.stat}>
                  <ThemedText variant="caption" color="muted">En attente</ThemedText>
                  <ThemedText variant="h3" bold style={{ color: colors.warning }}>{myRow.attendance.pending_justifications}</ThemedText>
                </ThemedView>
              </View>
            )}

            {sessions.length === 0 ? (
              <ThemedView variant="card" rounded="xl" style={{ padding: Spacing['3xl'], alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
                  Aucune séance planifiée pour le moment.
                </ThemedText>
              </ThemedView>
            ) : (
              sessions.map((session) => {
                const record = recordBySession.get(session.id);
                const status = record?.status ?? 'ABSENT';
                const meta = STATUS_META[status];
                return (
                  <ThemedView key={session.id} variant="card" rounded="xl" elevated style={{ marginBottom: Spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="body" bold>
                          {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {'  '}·{'  '}{session.start_time}–{session.end_time}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: Spacing.sm }}>
                          <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                            <ThemedText variant="label" style={{ color: colors.primary }}>
                              {TYPE_LABELS[session.session_type] ?? session.session_type}
                            </ThemedText>
                          </View>
                          {session.is_cancelled && (
                            <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
                              <ThemedText variant="label" color="secondary">Annulée</ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText variant="body" color="secondary" style={{ marginTop: 6 }}>
                          {session.title || `Séance ${TYPE_LABELS[session.session_type] ?? session.session_type}`}
                        </ThemedText>
                        {session.location ? (
                          <ThemedText variant="caption" color="muted" style={{ marginTop: 2 }}>
                            {session.location}
                          </ThemedText>
                        ) : null}
                      </View>
                      <View style={[styles.badge, { backgroundColor: meta.bg, marginLeft: Spacing.md }]}>
                        <ThemedText variant="label" style={{ color: meta.color }}>{meta.label}</ThemedText>
                      </View>
                    </View>

                    {record && status === 'ABSENT' && record.justification_status === 'NONE' && (
                      <TouchableOpacity onPress={() => setJustifyingId(justifyingId === record.id ? null : record.id)}>
                        <ThemedText variant="label" style={{ color: colors.primary, marginTop: Spacing.md }}>
                          {justifyingId === record.id ? 'Annuler' : 'Justifier cette absence'}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                    {record && record.justification_status !== 'NONE' && (
                      <ThemedText
                        variant="label"
                        style={{
                          color:
                            record.justification_status === 'APPROVED'
                              ? colors.success
                              : record.justification_status === 'REJECTED'
                                ? colors.error
                                : colors.warning,
                          marginTop: Spacing.md,
                        }}
                      >
                        {record.justification_status === 'APPROVED'
                          ? 'Absence justifiée ✓'
                          : record.justification_status === 'REJECTED'
                            ? 'Justification refusée'
                            : 'Justification en attente...'}
                      </ThemedText>
                    )}

                    {justifyingId === record?.id && status === 'ABSENT' && record.justification_status === 'NONE' && (
                      <ThemedView variant="secondary" rounded="lg" style={{ padding: Spacing.md, marginTop: Spacing.md }}>
                        <TextInput
                          value={justificationText}
                          onChangeText={setJustificationText}
                          placeholder="Raison de l'absence (certificat médical...)"
                          placeholderTextColor={colors.text + '66'}
                          multiline
                          style={{
                            borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: Spacing.sm,
                            color: colors.text, backgroundColor: colors.background, minHeight: 70, textAlignVertical: 'top',
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => justifyAbsence(record)}
                          disabled={submitting}
                          style={[{
                            backgroundColor: colors.primary, padding: Spacing.md, borderRadius: BorderRadius.full,
                            marginTop: Spacing.md, alignItems: 'center', opacity: submitting ? 0.5 : 1,
                          }]}
                        >
                          {submitting ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <ThemedText bold style={{ color: '#fff' }}>Envoyer la justification</ThemedText>
                          )}
                        </TouchableOpacity>
                        <ThemedText variant="caption" color="muted" style={{ marginTop: Spacing.sm }}>À justifier sous 48h.</ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                );
              })
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <ThemedView variant="card" rounded="lg" elevated style={[styles.stat, { flex: 1 }]}>
                <ThemedText variant="caption" color="muted">Session principale</ThemedText>
                {myRow?.session_1.average != null ? (
                  <>
                    <ThemedText variant="h3" bold style={{ marginTop: 4 }}>
                      {myRow.session_1.average.toFixed(2)}/20
                    </ThemedText>
                    <View style={{ marginTop: Spacing.sm }}>
                      {decisionBadge(myRow.session_1.decision, myRow.session_1.decision_display)}
                    </View>
                  </>
                ) : (
                  <ThemedText variant="caption" color="muted" style={{ marginTop: 4 }}>Pas encore délibéré.</ThemedText>
                )}
              </ThemedView>
              <ThemedView variant="card" rounded="lg" elevated style={[styles.stat, { flex: 1 }]}>
                <ThemedText variant="caption" color="muted">Rattrapage</ThemedText>
                {myRow?.session_2.average != null ? (
                  <>
                    <ThemedText variant="h3" bold style={{ marginTop: 4 }}>
                      {myRow.session_2.average.toFixed(2)}/20
                    </ThemedText>
                    <View style={{ marginTop: Spacing.sm }}>
                      {decisionBadge(myRow.session_2.decision, myRow.session_2.decision_display)}
                    </View>
                  </>
                ) : (
                  <ThemedText variant="caption" color="muted" style={{ marginTop: 4 }}>Pas de rattrapage.</ThemedText>
                )}
              </ThemedView>
            </View>

            {myRow && myRow.evaluations.length > 0 && (
              <ThemedView variant="card" rounded="xl" elevated style={{ marginTop: Spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                  <Ionicons name="flask-outline" size={17} color={colors.info} />
                  <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>Évaluations</ThemedText>
                </View>
                {myRow.evaluations.map((ev, idx) => {
                  const kindLabel = ev.kind === 'CONTINUOUS' ? 'Cont. continu' : ev.kind === 'EXAM' ? 'Examen' : 'Oral';
                  return (
                    <View
                      key={ev.id}
                      style={[
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border + '44', paddingTop: Spacing.md },
                        idx > 0 && { marginTop: Spacing.md },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="body" bold>{ev.title}</ThemedText>
                          <ThemedText variant="caption" color="muted">{kindLabel} · coef {Number(ev.coefficient).toLocaleString('fr-FR')}</ThemedText>
                        </View>
                        <ThemedText variant="body" bold>
                          {ev.note != null ? `${ev.note.toFixed(2)}/20` : '—'}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </ThemedView>
            )}

            {transcript && transcript.rows.length > 0 && (
              <ThemedView variant="card" rounded="xl" elevated style={{ marginTop: Spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                  <Ionicons name="document-text-outline" size={17} color={colors.primary} />
                  <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>Votre relevé de notes</ThemedText>
                </View>
                {transcript.rows.map((row) => (
                  <View key={row.enrollment_id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <ThemedText variant="body" bold>{row.student.full_name}</ThemedText>
                      <ThemedText variant="caption" color="muted">
                        Assiduité : {row.attendance_rate != null ? `${row.attendance_rate}%` : '—'} · {row.final.decision_display}
                      </ThemedText>
                    </View>
                    <ThemedText variant="body" bold>
                      {row.final.average != null ? `${row.final.average.toFixed(2)}/20` : '—'}
                      {row.credits_earned > 0 ? ` · ${row.credits_earned} ECTS` : ''}
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
            )}

            <ThemedText variant="caption" color="muted" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
              Notes sur 20 · validation à 10/20 par votre professeur.
            </ThemedText>
          </>
        )}
      </ScrollView>
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
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    marginTop: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  stat: {
    padding: Spacing.lg,
    minWidth: 110,
    flexGrow: 1,
  },
});