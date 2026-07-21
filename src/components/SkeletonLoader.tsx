import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing } from '../theme/colors';

interface Props {
  width?: number | string;
  height?: number;
  rounded?: keyof typeof BorderRadius | number;
  style?: any;
}

export function SkeletonLoader({ width = '100%', height = 20, rounded = 'lg', style }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const radius = typeof rounded === 'number' ? rounded : BorderRadius[rounded];

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
}
