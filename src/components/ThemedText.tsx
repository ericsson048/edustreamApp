import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize } from '../theme/colors';

interface Props extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'link';
  bold?: boolean;
}

export function ThemedText({ variant = 'body', color = 'primary', bold, style, ...props }: Props) {
  const { colors } = useTheme();
  const colorMap = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textSecondary,
    muted: colors.textMuted,
    link: colors.primary,
  };

  const sizeMap: Record<string, number> = {
    h1: FontSize['3xl'],
    h2: FontSize['2xl'],
    h3: FontSize.xl,
    body: FontSize.base,
    caption: FontSize.sm,
    label: FontSize.xs,
  };

  const weightMap: Record<string, TextStyle['fontWeight']> = {
    h1: '700',
    h2: '700',
    h3: '600',
    body: '400',
    caption: '400',
    label: '600',
  };

  return (
    <Text
      style={[{ color: colorMap[color], fontSize: sizeMap[variant], fontWeight: bold ? '700' : weightMap[variant] as any }, style]}
      {...props}
    />
  );
}
