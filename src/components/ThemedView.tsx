import { View, type ViewProps, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius } from '../theme/colors';

interface Props extends ViewProps {
  variant?: 'surface' | 'card' | 'secondary' | 'primaryLight';
  rounded?: keyof typeof BorderRadius | number;
  elevated?: boolean;
}

export function ThemedView({ variant = 'surface', rounded = 'xl', elevated, style, children, ...props }: Props) {
  const { colors } = useTheme();
  const bgMap = {
    surface: colors.background,
    card: colors.surface,
    secondary: colors.surfaceSecondary,
    primaryLight: colors.primaryLight,
  };

  const radius = typeof rounded === 'number' ? rounded : BorderRadius[rounded];

  return (
    <View
      style={[
        { backgroundColor: bgMap[variant], borderRadius: radius },
        elevated && {
          ...Platform.select({
            ios: { shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
            android: { elevation: 4 },
            default: {},
          }),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
