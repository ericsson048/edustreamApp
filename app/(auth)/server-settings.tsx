import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ApiServerSettings } from '../../src/components/ApiServerSettings';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Spacing } from '../../src/theme/colors';

export default function ServerSettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Retour" style={{ marginBottom: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Configuration du serveur</ThemedText>
      </View>
      <View style={{ padding: Spacing.xl }}>
        <ApiServerSettings />
      </View>
    </View>
  );
}
