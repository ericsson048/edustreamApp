import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { certificateService, type Certificate } from '../../../src/services/certificate';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function CertificateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await certificateService.list();
      setCerts(data.results ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Certificates</ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl }} showsVerticalScrollIndicator={false}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonLoader key={i} height={180} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : certs.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['5xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="ribbon-outline" size={40} color={colors.primary} />
            </View>
            <ThemedText variant="h3" bold style={{ marginTop: Spacing.lg }}>No Certificates Yet</ThemedText>
            <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
              Complete a course to earn your first certificate.
            </ThemedText>
          </ThemedView>
        ) : (
          certs.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => router.push(`/certificate/${c.id}`)}>
              <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: colors.success }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={[styles.certIcon, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="ribbon" size={24} color={colors.success} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <ThemedText variant="h3" bold>{c.course_title}</ThemedText>
                    <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>{c.instructor_name}</ThemedText>
                    <ThemedText variant="caption" color="muted" style={{ marginTop: Spacing.sm }}>
                      {c.certificate_code} · {new Date(c.issued_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </ThemedView>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backBtn: {
    marginBottom: Spacing.sm,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
