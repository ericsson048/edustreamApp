import { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAlert } from '../../../src/components/AlertDialog';
import { BorderRadius, FontSize, Spacing } from '../../../src/theme/colors';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, updateUser, logout } = useAuth();
  const { alert } = useAlert();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateUser({ full_name: name });
      setSaving(false);
      await alert({ title: 'Saved', message: 'Profile updated successfully.' });
    } catch {
      setSaving(false);
      await alert({ title: 'Error', message: 'Could not update profile.' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Profile</ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl }} showsVerticalScrollIndicator={false}>
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.xl }}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <ThemedText style={{ fontSize: 36, color: colors.primary, fontWeight: '700' }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </ThemedText>
          </View>
          <ThemedText variant="h3" bold style={{ marginTop: Spacing.md }}>{user?.full_name}</ThemedText>
          <ThemedText variant="body" color="secondary">{user?.email}</ThemedText>
          <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="school-outline" size={14} color={colors.primary} />
            <ThemedText variant="label" style={{ color: colors.primary, marginLeft: 4 }}>{user?.role}</ThemedText>
          </View>
        </ThemedView>

        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginBottom: Spacing.xl }}>
          <ThemedText variant="body" bold style={{ marginBottom: Spacing.md }}>Edit Profile</ThemedText>
          <ThemedView variant="secondary" rounded="xl" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
            <Ionicons name="person-outline" size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: colors.text }]}
            />
          </ThemedView>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg }]}
          >
            <ThemedText bold style={{ color: '#fff' }}>{saving ? 'Saving...' : 'Save Changes'}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backBtn: {
    marginBottom: Spacing.sm,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  input: { height: 50, fontSize: FontSize.base, marginLeft: Spacing.md, flex: 1 },
  saveBtn: { height: 48, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
});
