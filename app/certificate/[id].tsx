import { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Share, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { certificateService, type Certificate } from '../../src/services/certificate';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function CertificateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    certificateService.list({ id }).then(d => {
      setCert((d.results ?? [])[0] ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    if (!cert) return;
    try {
      await Share.share({
        title: `Certificate - ${cert.course_title}`,
        message: `I completed "${cert.course_title}" on EduStream! Certificate code: ${cert.certificate_code}`,
      });
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Certificate</ThemedText>
        <TouchableOpacity onPress={handleShare} disabled={!cert}>
          <Ionicons name="share-outline" size={24} color={cert ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <SkeletonLoader height={450} rounded="xl" />
        ) : !cert ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['5xl'] }}>
            <Ionicons name="ribbon-outline" size={48} color={colors.textMuted} />
            <ThemedText variant="h3" bold style={{ marginTop: Spacing.lg }}>No Certificate Found</ThemedText>
            <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
              Complete your course and claim your certificate from the player.
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            <ThemedView variant="card" style={styles.certCard}>
              {/* Background decoration */}
              <View style={styles.certBg1} />
              <View style={styles.certBg2} />
              <View style={[styles.certCornerTL, { backgroundColor: colors.primary }]} />
              <View style={[styles.certCornerBR, { backgroundColor: colors.primary }]} />

              <View style={styles.certContent}>
                <ThemedText variant="caption" bold style={[styles.certLabel, { color: colors.primary }]}>
                  EDUSTREAM ACHIEVEMENT
                </ThemedText>

                <View style={[styles.awardCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="ribbon" size={32} color="#fff" />
                </View>

                <ThemedText variant="h2" bold style={styles.certTitle}>
                  Certificate of Completion
                </ThemedText>

                <View style={[styles.divider, { backgroundColor: colors.primary + '66' }]} />

                <ThemedText variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  This is to certify that
                </ThemedText>

                <ThemedText variant="h1" bold style={[styles.studentName, { color: colors.primary }]}>
                  {user?.full_name || 'Student'}
                </ThemedText>

                <ThemedText variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  has successfully completed the course
                </ThemedText>

                <ThemedText variant="h3" bold style={{ textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl }}>
                  {cert.course_title || 'Course'}
                </ThemedText>

                <View style={styles.signatureRow}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={[styles.signatureLine, { borderBottomColor: colors.text }]} />
                    <ThemedText variant="caption" bold style={{ marginTop: 4 }}>{cert.instructor_name || 'Instructor'}</ThemedText>
                    <ThemedText variant="caption" color="muted">Instructor</ThemedText>
                  </View>

                  <View style={[styles.sealCircle, { borderColor: colors.border }]}>
                    <View style={[styles.sealInner, { borderColor: colors.border + '88' }]}>
                      <Ionicons name="ribbon" size={20} color={colors.primary} />
                    </View>
                  </View>

                  <View style={{ alignItems: 'center' }}>
                    <View style={[styles.signatureLine, { borderBottomColor: colors.text }]} />
                    <ThemedText variant="caption" bold style={{ marginTop: 4 }}>EduStream</ThemedText>
                    <ThemedText variant="caption" color="muted">Director of Education</ThemedText>
                  </View>
                </View>

                <ThemedText variant="caption" color="muted" style={{ marginTop: Spacing.xl }}>
                  Certificate: {cert.certificate_code} · Issued: {formatDate(cert.issued_at)}
                </ThemedText>
              </View>
            </ThemedView>

            {/* Verified badge */}
            <View style={[styles.verifiedBox, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="body" bold style={{ color: colors.primary }}>Verified Certificate</ThemedText>
                <ThemedText variant="caption" style={{ color: colors.primary + 'cc' }}>
                  This certificate is verified by EduStream and linked to the learner profile and course completion record.
                </ThemedText>
              </View>
            </View>

            {/* Details */}
            <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
              <ThemedView variant="card" rounded="xl" elevated style={{ flex: 1, padding: Spacing.md }}>
                <ThemedText variant="caption" bold color="muted" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Issue Date</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm }}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <ThemedText variant="body" bold style={{ marginLeft: Spacing.sm }}>{formatDate(cert.issued_at)}</ThemedText>
                </View>
              </ThemedView>
              <ThemedView variant="card" rounded="xl" elevated style={{ flex: 1, padding: Spacing.md }}>
                <ThemedText variant="caption" bold color="muted" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Certificate Code</ThemedText>
                <ThemedText variant="body" bold style={{ marginTop: Spacing.sm }} selectable>{cert.certificate_code}</ThemedText>
              </ThemedView>
            </View>

            {/* Share button */}
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
              <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Share Certificate</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  certCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.12,
    shadowRadius: 80,
    elevation: 12,
  },
  certBg1: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.4,
  },
  certBg2: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.4,
  },
  certCornerTL: {
    position: 'absolute',
    top: -40, left: -40,
    width: 128, height: 128,
    transform: [{ rotate: '45deg' }],
  },
  certCornerBR: {
    position: 'absolute',
    bottom: -40, right: -40,
    width: 128, height: 128,
    transform: [{ rotate: '45deg' }],
  },
  certContent: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    paddingTop: Spacing['5xl'],
    paddingBottom: Spacing['4xl'],
  },
  certLabel: {
    letterSpacing: 7,
    marginBottom: Spacing.lg,
  },
  awardCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  certTitle: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  divider: {
    width: 144, height: 1,
    marginVertical: Spacing.lg,
  },
  studentName: {
    fontSize: 28,
    fontStyle: 'italic',
    marginVertical: Spacing.md,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  signatureLine: {
    width: 160,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sealCircle: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  sealInner: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 16,
    marginTop: Spacing.xl,
  },
});
