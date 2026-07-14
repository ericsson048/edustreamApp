import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing } from '../theme/colors';

interface Props {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, subtitle, rightAction }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.lg, backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        <View style={styles.left}>
          <ThemedText variant="h1" bold>{title}</ThemedText>
          {subtitle && <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>{subtitle}</ThemedText>}
        </View>
        {rightAction && <View>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
  },
});
