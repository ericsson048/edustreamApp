import { View, ScrollView, StyleSheet } from 'react-native';
import { PressScale } from '../../../src/components/PressScale';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { LanguageSwitcher } from '../../../src/components/LanguageSwitcher';
import { NotificationBell } from '../../../src/components/NotificationBell';
import { ThemeSwitcher } from '../../../src/components/ThemeSwitcher';

const baseMenuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string; color: string }[] = [
  { icon: 'git-network-outline', label: 'Skill Tree', route: 'skill-tree', color: '#6366F1' },
  { icon: 'timer-outline', label: 'Focus Room', route: 'focus', color: '#22C55E' },
  { icon: 'document-text-outline', label: 'Assignments', route: 'assignments', color: '#F59E0B' },
  { icon: 'bar-chart-outline', label: 'Grades', route: 'grades', color: '#EF4444' },
  { icon: 'calendar-outline', label: 'Schedule', route: 'schedule', color: '#14B8A6' },
  { icon: 'chatbubbles-outline', label: 'Messages', route: 'messages', color: '#3B82F6' },
  { icon: 'people-outline', label: 'Community', route: 'community', color: '#06B6D4' },
  { icon: 'notifications-outline', label: 'Notifications', route: 'notifications', color: '#8B5CF6' },
  { icon: 'ribbon-outline', label: 'Certificate', route: 'certificate', color: '#EC4899' },
  { icon: 'person-outline', label: 'Profile', route: 'profile', color: '#4F46E5' },
  { icon: 'settings-outline', label: 'Settings', route: 'settings', color: '#64748B' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const menuItems = baseMenuItems;

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + Spacing.lg }}>
      <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <ThemedText variant="h1" bold>More</ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>Explore all features</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <NotificationBell />
          <ThemeSwitcher />
          <LanguageSwitcher />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing['6xl'] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
          {menuItems.map((item) => (
            <PressScale
              key={item.route}
              onPress={() => router.navigate(item.route)}
              activeOpacity={0.7}
              style={{ width: '46%' }}
            >
              <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, alignItems: 'center' }}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={item.icon} size={26} color={item.color} />
                </View>
                <ThemedText variant="caption" bold style={{ marginTop: Spacing.sm, textAlign: 'center' }}>{item.label}</ThemedText>
              </ThemedView>
            </PressScale>
          ))}
        </View>

        <ThemedView variant="card" rounded="xl" elevated style={{ marginTop: Spacing['3xl'], padding: Spacing.xl, flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <ThemedText variant="body" bold style={{ color: colors.primary }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
            </ThemedText>
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText variant="body" bold>{user?.full_name || 'Student'}</ThemedText>
            <ThemedText variant="caption" color="secondary">{user?.email || ''}</ThemedText>
          </View>
        </ThemedView>

        <PressScale
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.error }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <ThemedText bold style={{ color: colors.error, marginLeft: Spacing.sm }}>Sign Out</ThemedText>
        </PressScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
