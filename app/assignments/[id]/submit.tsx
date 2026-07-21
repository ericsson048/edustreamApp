import { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentText, setContentText] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Submission | null>(null);

  useEffect(() => {
    if (!id) return;
    learningService.getAssignment(id).then(setAssignment).catch(() => router.back()).finally(() => setLoading(false));
  }, [id]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets?.[0]) {
        setFile({ uri: result.assets[0].uri, name: result.assets[0].name, size: result.assets[0].size });
      }
    } catch {}
  };

  const handleSubmit = async () => {
    if (!id || (!contentText.trim() && !file)) return;
    setSubmitting(true);
    try {
      let file_url: string | undefined;
      if (file) {
        file_url = await learningService.uploadFile(file.uri, file.name, 'application/octet-stream');
      }
      const sub = await learningService.createSubmission({
        assignment: id,
        content_text: contentText.trim() || undefined,
        file_url,
      });
      setSubmitted(sub);
      await alert({ title: t('common.submit'), message: t('assignments.submittedMessage') });
    } catch {
      await alert({ title: t('common.error'), message: 'Could not submit. Please try again.' });
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
            <ThemedText variant="h3" bold style={{ marginTop: Spacing.lg }}>{t('assignments.submitted')}</ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
              {t('assignments.submittedMessage')}
            </ThemedText>
            <TouchableOpacity onPress={() => router.back()} style={[styles.btn, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}>
              <ThemedText bold style={{ color: '#fff' }}>{t('common.back')}</ThemedText>
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
                  <ThemedText variant="caption" color="secondary">{t('assignments.due', { date: new Date(assignment.due_date).toLocaleDateString() })}</ThemedText>
                  <ThemedText variant="caption" color="secondary">{assignment.points} pts</ThemedText>
                </View>
              </ThemedView>
              <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.xl, lineHeight: 22 }}>{assignment.description}</ThemedText>
            </ThemedView>

            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginTop: Spacing.xl }}>
              <ThemedText variant="body" bold>{t('common.submit')}</ThemedText>
              <TextInput
                multiline
                placeholder={t('assignments.writeAnswer')}
                placeholderTextColor={colors.textMuted}
                value={contentText}
                onChangeText={setContentText}
                style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
              />
              <TouchableOpacity onPress={pickFile} style={[styles.fileBtn, { borderColor: colors.border }]}>
                <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                <ThemedText style={{ color: colors.primary, marginLeft: Spacing.sm, flex: 1 }}>
                  {file ? file.name : t('assignments.addFile')}
                </ThemedText>
                {file && (
                  <TouchableOpacity onPress={() => setFile(null)}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </ThemedView>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || (!contentText.trim() && !file)}
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: Spacing.xl, opacity: (!contentText.trim() && !file) || submitting ? 0.5 : 1 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>{t('assignments.submit')}</ThemedText>
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
    minHeight: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
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
