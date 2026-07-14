import { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAlert } from '../../src/components/AlertDialog';
import { courseService, type Course } from '../../src/services/courses';
import { billingService } from '../../src/services/billing';
import { enrollmentService } from '../../src/services/courses';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAlert();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;
    courseService.getCourse(id).then(setCourse).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleFreeEnroll = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      await enrollmentService.createEnrollment(id);
      await alert({ title: 'Enrolled!', message: 'You are now enrolled in this course.' });
      router.replace(`/player/${id}/${course?.modules?.[0]?.lessons?.[0]?.id || ''}`);
    } catch {
      await alert({ title: 'Error', message: 'Could not enroll. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  const handlePaidEnroll = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const checkout = await billingService.createCheckout(id);
      if (!checkout.checkout_url) {
        await alert({ title: 'Error', message: 'Could not initiate checkout.' });
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(checkout.checkout_url);
      setProcessing(false);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const sessionId = url.searchParams.get('session_id');
        if (sessionId) {
          setProcessing(true);
          const status = await billingService.verifySession(sessionId);
          if (status.paid && status.enrollment_id) {
            await alert({ title: 'Payment Successful!', message: 'You are now enrolled.' });
            router.replace(`/player/${id}/${course?.modules?.[0]?.lessons?.[0]?.id || ''}`);
          } else {
            await alert({ title: 'Payment Pending', message: 'Your payment is being processed. Check your enrollments shortly.' });
            router.replace(`/course/${id}`);
          }
        }
      }
    } catch {
      await alert({ title: 'Error', message: 'Checkout failed. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  const isFree = course?.price ? parseFloat(course.price) === 0 : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <SkeletonLoader height={160} rounded="xl" />
            <SkeletonLoader height={40} rounded="lg" style={{ marginTop: Spacing.xl, width: '60%' }} />
            <SkeletonLoader height={60} rounded="lg" style={{ marginTop: Spacing.lg }} />
          </>
        ) : course ? (
          <>
            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center' }}>
              <View style={[styles.courseIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="library-outline" size={40} color={colors.primary} />
              </View>
              <ThemedText variant="h3" bold style={{ marginTop: Spacing.md, textAlign: 'center' }}>{course.title}</ThemedText>
              <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>{course.instructor_name || 'Instructor'}</ThemedText>
            </ThemedView>

            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginTop: Spacing.xl }}>
              <ThemedText variant="body" bold>Order Summary</ThemedText>
              <View style={styles.row}>
                <ThemedText variant="body" color="secondary">Course</ThemedText>
                <ThemedText variant="body">{course.title}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText variant="body" color="secondary">Price</ThemedText>
                <ThemedText variant="body" bold>
                  {isFree ? 'Free' : `$${parseFloat(course.price || '0').toFixed(2)}`}
                </ThemedText>
              </View>
              <View style={[styles.divider, { borderBottomColor: colors.border }]} />
              <View style={styles.row}>
                <ThemedText variant="body" bold>Total</ThemedText>
                <ThemedText variant="h3" bold style={{ color: isFree ? colors.success : colors.primary }}>
                  {isFree ? 'Free' : `$${parseFloat(course.price || '0').toFixed(2)}`}
                </ThemedText>
              </View>
            </ThemedView>

            <TouchableOpacity
              onPress={isFree ? handleFreeEnroll : handlePaidEnroll}
              disabled={processing}
              style={[styles.payBtn, { backgroundColor: isFree ? colors.success : colors.primary, marginTop: Spacing['2xl'] }]}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isFree ? 'download-outline' : 'card-outline'}
                    size={22}
                    color="#fff"
                  />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>
                    {isFree ? 'Enroll for Free' : `Pay $${parseFloat(course.price || '0').toFixed(2)}`}
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>

            {!isFree && (
              <ThemedView variant="secondary" rounded="lg" style={{ padding: Spacing.md, marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                <ThemedText variant="caption" color="muted" style={{ marginLeft: Spacing.sm }}>
                  Secure payment via Stripe. Your card info is never stored on our servers.
                </ThemedText>
              </ThemedView>
            )}
          </>
        ) : (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['5xl'] }}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.md }}>Course not found.</ThemedText>
          </ThemedView>
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
  courseIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  divider: {
    borderBottomWidth: 1,
    marginVertical: Spacing.sm,
  },
  payBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
