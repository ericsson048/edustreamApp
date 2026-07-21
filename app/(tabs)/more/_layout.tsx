import { Stack } from 'expo-router';
import { useTheme } from '../../../src/contexts/ThemeContext';

export default function MoreLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="community" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="skill-tree" />
      <Stack.Screen name="focus" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="grades" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="certificate" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
