import { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { learningService, type Quiz, type QuizAttempt } from '../../src/services/learning';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    learningService.getQuiz(id).then(setQuiz).catch(() => router.back()).finally(() => setLoading(false));
  }, [id]);

  const questions = quiz?.questions ?? [];
  const question = questions[currentIdx];
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount >= total;

  const selectAnswer = (qId: string, idx: number) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [qId]: idx }));
  };

  const submitQuiz = async () => {
    if (!quiz || !allAnswered) return;
    setSubmitting(true);
    try {
      const attempt = await learningService.submitQuizAttempt({ quiz: quiz.id, answers });
      setResult(attempt);
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        {!result && (
          <ThemedText variant="caption" color="secondary">{currentIdx + 1}/{total}</ThemedText>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <SkeletonLoader height={30} rounded="lg" style={{ width: '60%' }} />
            <SkeletonLoader height={100} rounded="lg" style={{ marginTop: Spacing.lg }} />
            <SkeletonLoader height={50} rounded="lg" style={{ marginTop: Spacing.md }} />
            <SkeletonLoader height={50} rounded="lg" style={{ marginTop: Spacing.sm }} />
            <SkeletonLoader height={50} rounded="lg" style={{ marginTop: Spacing.sm }} />
          </>
        ) : result ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <View style={[styles.resultIcon, { backgroundColor: result.passed ? colors.success + '20' : colors.error + '20' }]}>
              <Ionicons name={result.passed ? 'trophy' : 'refresh'} size={44} color={result.passed ? colors.success : colors.error} />
            </View>
            <ThemedText variant="h1" bold style={{ marginTop: Spacing.lg, color: result.passed ? colors.success : colors.error }}>
              {parseFloat(result.score).toFixed(0)}%
            </ThemedText>
            <ThemedText variant="h3" bold style={{ marginTop: Spacing.sm }}>{result.passed ? 'Passed!' : 'Failed'}</ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
              {result.passed ? 'Great job! You passed the quiz.' : `You need ${quiz?.passing_score ?? 70}% to pass. Try again.`}
            </ThemedText>
            <TouchableOpacity onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}>
              <ThemedText bold style={{ color: '#fff' }}>Continue</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : question ? (
          <>
            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg }}>
              <ThemedText variant="body" bold style={{ lineHeight: 24 }}>{question.prompt}</ThemedText>
            </ThemedView>

            <View style={{ marginTop: Spacing.xl }}>
              {question.options.map((opt, idx) => {
                const selected = answers[question.id] === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => selectAnswer(question.id, idx)}
                    style={[styles.option, { backgroundColor: selected ? colors.primary + '15' : colors.surface, borderColor: selected ? colors.primary : colors.surface }]}
                  >
                    <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <ThemedText variant="body" style={{ flex: 1, marginLeft: Spacing.md }}>{opt}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {!result && total > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            style={[styles.navBtn, { opacity: currentIdx === 0 ? 0.4 : 1 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <ThemedText variant="body" bold style={{ color: colors.primary, marginLeft: 4 }}>Previous</ThemedText>
          </TouchableOpacity>

          {currentIdx < total - 1 ? (
            <TouchableOpacity
              onPress={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
              style={[styles.navBtn]}
            >
              <ThemedText variant="body" bold style={{ color: colors.primary, marginRight: 4 }}>Next</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={submitQuiz}
              disabled={!allAnswered || submitting}
              style={[styles.submitBtn, { backgroundColor: allAnswered ? colors.success : colors.textMuted }]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText bold style={{ color: '#fff' }}>Submit</ThemedText>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  submitBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.full,
  },
  resultIcon: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['3xl'],
    borderRadius: BorderRadius.full,
  },
});
