import { useRef, type ReactNode } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

interface Props {
  onPress?: () => void;
  children: ReactNode;
  style?: any;
  scaleTo?: number;
  activeOpacity?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function PressScale({ onPress, children, style, scaleTo = 0.97, activeOpacity = 0.8, disabled, accessibilityLabel }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
      mass: 0.5,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      activeOpacity={activeOpacity}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
