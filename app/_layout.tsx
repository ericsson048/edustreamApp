import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { OnboardingProvider, useOnboarding } from '../src/contexts/OnboardingContext';
import { AlertProvider } from '../src/components/AlertDialog';
import { NetworkProvider } from '../src/contexts/NetworkContext';
import { OfflineBanner } from '../src/components/OfflineBanner';
import '../src/i18n';
import { NotificationSetup } from '../src/components/NotificationSetup';

function RootNavigator() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isLoading: onboardingLoading, hasCompleted } = useOnboarding();
  const { scheme, colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const isLoading = authLoading || onboardingLoading;

  useEffect(() => {
    if (isLoading) return;

    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inAuthGroup = segments[0] === '(auth)';

    if (!hasCompleted && !inOnboardingGroup) {
      router.replace('/(onboarding)');
    } else if (hasCompleted && !isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (hasCompleted && isAuthenticated && (inOnboardingGroup || inAuthGroup)) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isLoading, hasCompleted, isAuthenticated, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AlertProvider>
      <NotificationSetup />
      <OfflineBanner />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="player/[courseId]/[lessonId]" />
        <Stack.Screen name="certificate/[id]" />
        <Stack.Screen name="checkout/[id]" />
        <Stack.Screen name="quiz/[id]" />
        <Stack.Screen name="assignments/[id]/submit" />
        <Stack.Screen name="live/[id]" />
        <Stack.Screen name="ai-tutor/[courseId]/[lessonId]" />
        <Stack.Screen name="messages/[id]" />
        <Stack.Screen name="community" />
      </Stack>
    </AlertProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <OnboardingProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </OnboardingProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}
