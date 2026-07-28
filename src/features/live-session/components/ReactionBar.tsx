import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Spacing } from '../../../theme/colors';

const QUICK_REACTIONS = ['👍', '👏', '🔥', '🎉', '❤️', '😂'];

interface ReactionBarProps {
  visible: boolean;
  onSelect: (reaction: string) => void;
  onClose: () => void;
}

export function ReactionBar({ visible, onSelect, onClose }: ReactionBarProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.bar, { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }]}>
        {QUICK_REACTIONS.map((r) => (
          <TouchableOpacity key={r} onPress={() => onSelect(r)} style={styles.reactionBtn}>
            <Animated.Text style={styles.reactionEmoji}>{r}</Animated.Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 80, left: 0, right: 0,
    zIndex: 20, alignItems: 'center',
  },
  bar: {
    flexDirection: 'row', gap: 6,
    backgroundColor: 'rgba(30,41,59,0.95)', borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionBtn: { padding: 4 },
  reactionEmoji: { fontSize: 24 },
  closeBtn: {
    padding: 4, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 12,
    paddingHorizontal: 8,
  },
});
