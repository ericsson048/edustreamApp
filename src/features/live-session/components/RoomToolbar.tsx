import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../../../theme/colors';

interface ToolbarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  isHandRaised: boolean;
  showChat: boolean;
  isHost: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onToggleHand: () => void;
  onToggleReactions: () => void;
  onToggleChat: () => void;
  onToggleEntries?: () => void;
  pendingEntryCount?: number;
  onLeave: () => void;
  onEndSession?: () => void;
  onMuteAll?: () => void;
}

export function Toolbar({
  isMuted, isVideoOff, isScreenSharing, isHandRaised, showChat, isHost,
  onToggleMute, onToggleVideo, onToggleScreenShare, onToggleHand, onToggleReactions, onToggleChat, onToggleEntries, pendingEntryCount, onLeave, onEndSession, onMuteAll,
}: ToolbarProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: menuOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [menuOpen, slideAnim]);

  const menuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; activeColor: string; onPress: () => void; destructive?: boolean }[] = [
    {
      icon: isHandRaised ? 'hand-left' : 'hand-left-outline',
      label: isHandRaised ? 'Lower hand' : 'Raise hand',
      active: isHandRaised,
      activeColor: '#f59e0b',
      onPress: () => { onToggleHand(); setMenuOpen(false); },
    },
    {
      icon: 'happy-outline',
      label: 'Reactions',
      active: false,
      activeColor: '#e2e8f0',
      onPress: () => { onToggleReactions(); setMenuOpen(false); },
    },
    {
      icon: showChat ? 'chatbubbles' : 'chatbubbles-outline',
      label: showChat ? 'Close chat' : 'Open chat',
      active: showChat,
      activeColor: '#3b82f6',
      onPress: () => { onToggleChat(); setMenuOpen(false); },
    },
  ];

  if (isHost && onToggleEntries) {
    menuItems.push({
      icon: 'people-outline',
      label: `Entry requests${pendingEntryCount && pendingEntryCount > 0 ? ` (${pendingEntryCount})` : ''}`,
      active: !!pendingEntryCount,
      activeColor: '#FBBF24',
      onPress: () => { onToggleEntries(); setMenuOpen(false); },
    });
  }

  if (isHost && onMuteAll) {
    menuItems.push({
      icon: 'mic-off',
      label: 'Mute all',
      active: false,
      activeColor: '#f59e0b',
      onPress: () => { onMuteAll(); setMenuOpen(false); },
    });
  }

  if (isHost && onEndSession) {
    menuItems.push({
      icon: 'stop-circle',
      label: 'End session',
      active: false,
      activeColor: '#ef4444',
      onPress: () => { onEndSession(); setMenuOpen(false); },
      destructive: true,
    });
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {menuOpen && (
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
      )}

      {menuOpen && (
        <Animated.View
          style={[
            styles.menu,
            {
              transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
              opacity: slideAnim,
            },
          ]}
        >
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, item.destructive && styles.menuRowDestructive]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIconWrap, item.active && { backgroundColor: item.activeColor + '33' }]}>
                <Ionicons name={item.icon} size={20} color={item.active ? item.activeColor : item.destructive ? '#fca5a5' : '#e2e8f0'} />
              </View>
              <Text style={[styles.menuLabel, item.active && { color: item.activeColor }, item.destructive && { color: '#fca5a5' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      <View style={styles.row}>
        <ToolBtn
          icon={isMuted ? 'mic-off' : 'mic'}
          active={isMuted}
          activeColor="#ef4444"
          onPress={onToggleMute}
        />
        <ToolBtn
          icon={isVideoOff ? 'videocam-off' : 'videocam'}
          active={isVideoOff}
          activeColor="#ef4444"
          onPress={onToggleVideo}
        />
        {onToggleScreenShare && (
          <ToolBtn
            icon="desktop-outline"
            active={!!isScreenSharing}
            activeColor="#0ea5e9"
            onPress={onToggleScreenShare}
          />
        )}
        <ToolBtn
          icon="ellipsis-horizontal"
          active={menuOpen}
          activeColor="#818cf8"
          onPress={() => setMenuOpen((v) => !v)}
        />
        <TouchableOpacity onPress={onLeave} style={styles.leaveBtn} accessibilityLabel="Leave call">
          <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToolBtn({ icon, active, activeColor, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toolBtn, active && { backgroundColor: activeColor + '33' }]}
    >
      <Ionicons name={icon} size={22} color={active ? activeColor : '#e2e8f0'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  toolBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  leaveBtn: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: '#dc2626',
    justifyContent: 'center', alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  menu: {
    position: 'absolute',
    bottom: 72,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(30,41,59,0.97)',
    borderRadius: 16,
    padding: 6,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  menuRowDestructive: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
});
