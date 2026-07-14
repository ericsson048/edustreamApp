import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { OnboardingProvider, useOnboarding } from '../src/contexts/OnboardingContext';
import { AlertProvider } from '../src/components/AlertDialog';
import '../src/i18n';
import { NotificationSetup } from '../src/components/NotificationSetup';

function RootNavigator() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isLoading: onboardingLoading, hasCompleted } = useOnboarding();
  const { scheme, colors } = useTheme();

  if (authLoading || onboardingLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AlertProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {!hasCompleted ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(onboarding)" />
        </Stack>
      ) : !isAuthenticated ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <NotificationSetup />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="course/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="player/[courseId]/[lessonId]" options={{ headerShown: false }} />
          <Stack.Screen name="certificate/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="checkout/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="quiz/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="assignments/[id]/submit" options={{ headerShown: false }} />
          <Stack.Screen name="live/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="ai-tutor/[courseId]/[lessonId]" options={{ headerShown: false }} />
          <Stack.Screen name="messages/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="community/groups/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="community/discussions/[id]" options={{ headerShown: false }} />
          {/* instructor/ routes - disabled for student-only phase */}
        </Stack>
      )}
    </AlertProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <OnboardingProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </OnboardingProvider>
    </ThemeProvider>
  );
}
