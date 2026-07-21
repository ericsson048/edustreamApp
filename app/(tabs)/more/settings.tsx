import { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAlert } from '../../../src/components/AlertDialog';
import { LanguageSwitcher } from '../../../src/components/LanguageSwitcher';
import { ThemeSwitcher } from '../../../src/components/ThemeSwitcher';
import { BorderRadius, FontSize, Spacing } from '../../../src/theme/colors';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { changePassword } = useAuth();
  const { alert } = useAlert();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) {
      await alert({ title: 'Error', message: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 6) {
      await alert({ title: 'Error', message: 'Password must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    try {
      await changePassword(oldPw, newPw);
      await alert({ title: 'Success', message: 'Password changed successfully.' });
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } catch {
      await alert({ title: 'Error', message: 'Could not change password. Check your current password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Settings</ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }} showsVerticalScrollIndicator={false}>
        {/* Theme */}
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginBottom: Spacing.lg }}>
          <ThemedText variant="body" bold style={{ marginBottom: Spacing.md }}>Appearance</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="moon-outline" size={20} color={colors.text} />
              <ThemedText style={{ marginLeft: Spacing.md }}>Dark Mode</ThemedText>
            </View>
            <ThemeSwitcher />
          </View>
        </ThemedView>

        {/* Language */}
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginBottom: Spacing.lg }}>
          <ThemedText variant="body" bold style={{ marginBottom: Spacing.md }}>Language</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="language-outline" size={20} color={colors.text} />
              <ThemedText style={{ marginLeft: Spacing.md }}>App Language</ThemedText>
            </View>
            <LanguageSwitcher />
          </View>
        </ThemedView>

        {/* Change Password */}
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginBottom: Spacing.lg }}>
          <ThemedText variant="body" bold style={{ marginBottom: Spacing.md }}>Change Password</ThemedText>
          <ThemedView variant="secondary" rounded="lg" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput placeholder="Current password" placeholderTextColor={colors.textMuted} value={oldPw} onChangeText={setOldPw} secureTextEntry style={[styles.input, { color: colors.text }]} />
          </ThemedView>
          <ThemedView variant="secondary" rounded="lg" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
            <Ionicons name="lock-open-outline" size={18} color={colors.textMuted} />
            <TextInput placeholder="New password" placeholderTextColor={colors.textMuted} value={newPw} onChangeText={setNewPw} secureTextEntry style={[styles.input, { color: colors.text }]} />
          </ThemedView>
          <ThemedView variant="secondary" rounded="lg" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textMuted} />
            <TextInput placeholder="Confirm new password" placeholderTextColor={colors.textMuted} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry style={[styles.input, { color: colors.text }]} />
          </ThemedView>
          <TouchableOpacity onPress={handleChangePassword} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: Spacing.sm, opacity: saving ? 0.6 : 1 }]}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText bold style={{ color: '#fff' }}>Update Password</ThemedText>}
          </TouchableOpacity>
        </ThemedView>

        {/* About */}
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl }}>
          <ThemedText variant="body" bold style={{ marginBottom: Spacing.md }}>About</ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            <ThemedText color="secondary">Version</ThemedText>
            <ThemedText>1.0.0</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText color="secondary">Platform</ThemedText>
            <ThemedText>EduStream Mobile</ThemedText>
          </View>
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
  input: {
    height: 44,
    fontSize: FontSize.base,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  saveBtn: {
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
