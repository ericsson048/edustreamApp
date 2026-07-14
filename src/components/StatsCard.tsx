import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../theme/colors';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
}

export function StatsCard({ icon, label, value, color }: Props) {
  const { colors } = useTheme();
  const accent = color || colors.primary;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <ThemedText variant="h2" bold style={{ marginTop: Spacing.sm }}>{value}</ThemedText>
      <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    minWidth: '45%',
    marginBottom: Spacing.sm,
    shadowColor: 'rgba(79,70,229,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
