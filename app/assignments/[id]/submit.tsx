import { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { learningService, type Assignment, type Submission } from '../../../src/services/learning';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';
import { useAlert } from '../../../src/components/AlertDialog';

export default function SubmitAssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAlert();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentText, setContentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Submission | null>(null);

  useEffect(() => {
    if (!id) return;
    learningService.getAssignment(id).then(setAssignment).catch(() => router.back()).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const sub = await learningService.createSubmission({ assignment: id, content_text: contentText.trim() || undefined });
      setSubmitted(sub);
      await alert({ title: 'Submitted!', message: 'Your assignment has been submitted.' });
    } catch {
      await alert({ title: 'Error', message: 'Could not submit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <SkeletonLoader height={30} rounded="lg" style={{ width: '70%' }} />
            <SkeletonLoader height={60} rounded="lg" style={{ marginTop: Spacing.md }} />
            <SkeletonLoader height={200} rounded="lg" style={{ marginTop: Spacing.lg }} />
          </>
        ) : submitted ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center', marginTop: Spacing['5xl'] }}>
            <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <ThemedText variant="h3" bold style={{ marginTop: Spacing.lg }}>Submitted!</ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
              Your assignment has been submitted successfully. The instructor will review it shortly.
            </ThemedText>
            <TouchableOpacity onPress={() => router.back()} style={[styles.btn, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}>
              <ThemedText bold style={{ color: '#fff' }}>Back to Assignments</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : assignment ? (
          <>
            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.typeIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="clipboard-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText variant="h2" bold>{assignment.title}</ThemedText>
                  {assignment.course_title && (
                    <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>{assignment.course_title}</ThemedText>
                  )}
                </View>
              </View>
              <ThemedView variant="secondary" rounded="lg" style={{ padding: Spacing.md, marginTop: Spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText variant="caption" color="secondary">Due: {new Date(assignment.due_date).toLocaleDateString()}</ThemedText>
                  <ThemedText variant="caption" color="secondary">{assignment.points} pts</ThemedText>
                </View>
              </ThemedView>
              <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.xl, lineHeight: 22 }}>{assignment.description}</ThemedText>
            </ThemedView>

            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginTop: Spacing.xl }}>
              <ThemedText variant="body" bold>Your Submission</ThemedText>
              <TextInput
                multiline
                placeholder="Write your answer here..."
                placeholderTextColor={colors.textMuted}
                value={contentText}
                onChangeText={setContentText}
                style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
              />
            </ThemedView>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: Spacing.xl }]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Submit Assignment</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    minHeight: 160,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  btn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
