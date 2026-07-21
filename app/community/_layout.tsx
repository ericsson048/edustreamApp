import { Stack } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function CommunityLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="groups/[id]" />
      <Stack.Screen name="discussions/[id]" />
    </Stack>
  );
}
