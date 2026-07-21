import { View, Image, StyleSheet } from 'react-native';
import { PressScale } from './PressScale';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing } from '../theme/colors';

interface Props {
  title: string;
  thumbnail?: string;
  instructor?: string;
  progress?: number;
  category?: string;
  onPress: () => void;
}

export function CourseCard({ title, thumbnail, instructor, progress, category, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <PressScale onPress={onPress} style={{ marginBottom: Spacing.md }}>
      <ThemedView variant="card" rounded="xl" elevated style={{ overflow: 'hidden' }}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="library-outline" size={36} color={colors.primary} />
          </View>
        )}
        <View style={styles.body}>
          <ThemedText variant="body" bold numberOfLines={2}>{title}</ThemedText>
          {category && (
            <View style={[styles.badge, { backgroundColor: colors.primaryLight, marginTop: Spacing.sm }]}>
              <ThemedText variant="caption" style={{ color: colors.primary }}>{category}</ThemedText>
            </View>
          )}
          {instructor ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs }}>
              <Ionicons name="person-outline" size={12} color={colors.textMuted} />
              <ThemedText variant="caption" color="secondary" style={{ marginLeft: 4 }}>{instructor}</ThemedText>
            </View>
          ) : null}
          {progress !== undefined && (
            <View style={styles.progressRow}>
              <View style={[styles.progressBg, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: colors.success }]} />
              </View>
              <ThemedText variant="caption" color="secondary" style={{ marginLeft: Spacing.sm }}>{Math.round(progress)}%</ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: '100%',
    height: 140,
  },
  body: {
    padding: Spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
