import { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAlert } from '../../../src/components/AlertDialog';
import { LanguageSwitcher } from '../../../src/components/LanguageSwitcher';
import { ThemeSwitcher } from '../../../src/components/ThemeSwitcher';
import { BorderRadius, FontSize, Spacing } from '../../../src/theme/colors';
import { apiClient } from '../../../src/services/apiClient';

interface NotifPrefs {
  notif_email: boolean;
  notif_push: boolean;
  notif_new_course: boolean;
  notif_assignments: boolean;
  notif_grades: boolean;
  notif_messages: boolean;
  notif_live: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  notif_email: true,
  notif_push: true,
  notif_new_course: true,
  notif_assignments: true,
  notif_grades: true,
  notif_messages: true,
  notif_live: true,
};

// ── Password strength helper ─────────────────────────────────────────────────
function pwStrength(pw: string): { label: string; color: string; score: number } {
  if (!pw) return { label: '', color: '', score: 0 };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { label: 'Faible', color: '#EF4444', score: s };
  if (s <= 3) return { label: 'Moyen', color: '#F59E0B', score: s };
  return { label: 'Fort', color: '#22C55E', score: s };
}

// ── Notif row ─────────────────────────────────────────────────────────────────
function NotifRow({
  icon, label, desc, value, onChange, disabled,
}: {
  icon: string; label: string; desc: string;
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.notifRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md }}>
        <View style={[styles.notifIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={icon as any} size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" bold>{label}</ThemedText>
          <ThemedText variant="label" color="secondary">{desc}</ThemedText>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { colors } = useTheme();
  const { changePassword } = useAuth();
  const { alert } = useAlert();
  const insets = useSafeAreaInsets();

  // Password
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Notifications
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const strength = pwStrength(newPw);

  useEffect(() => {
    apiClient.get('/auth/me/preferences/')
      .then(({ data }) => setPrefs({ ...DEFAULT_PREFS, ...data }))
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, []);

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) {
      await alert({ title: 'Erreur', message: 'Remplissez tous les champs.' });
      return;
    }
    if (newPw !== confirmPw) {
      await alert({ title: 'Erreur', message: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (newPw.length < 8) {
      await alert({ title: 'Erreur', message: 'Le mot de passe doit faire au moins 8 caractères.' });
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(oldPw, newPw);
      await alert({ title: 'Succès', message: 'Mot de passe modifié.' });
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      await alert({ title: 'Erreur', message: 'Vérifiez votre mot de passe actuel.' });
    } finally {
      setSavingPw(false);
    }
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const { data } = await apiClient.patch('/auth/me/preferences/', prefs);
      setPrefs({ ...DEFAULT_PREFS, ...data });
      await alert({ title: 'Succès', message: 'Préférences sauvegardées.' });
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de sauvegarder.' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const setPref = (key: keyof NotifPrefs) => (v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: v }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Paramètres</ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── Appearance ── */}
        <ThemedView variant="card" rounded="xl" elevated style={styles.section}>
          <ThemedText variant="body" bold style={styles.sectionTitle}>Apparence</ThemedText>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="moon-outline" size={20} color={colors.text} />
              <ThemedText>Mode sombre</ThemedText>
            </View>
            <ThemeSwitcher />
          </View>
        </ThemedView>

        {/* ── Language ── */}
        <ThemedView variant="card" rounded="xl" elevated style={styles.section}>
          <ThemedText variant="body" bold style={styles.sectionTitle}>Langue</ThemedText>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="language-outline" size={20} color={colors.text} />
              <ThemedText>Langue de l'application</ThemedText>
            </View>
            <LanguageSwitcher />
          </View>
        </ThemedView>

        {/* ── Notifications ── */}
        <ThemedView variant="card" rounded="xl" elevated style={styles.section}>
          <ThemedText variant="body" bold style={styles.sectionTitle}>Notifications</ThemedText>
          {prefsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.lg }} />
          ) : (
            <>
              <ThemedText variant="label" color="secondary" style={styles.subTitle}>Canaux</ThemedText>
              <NotifRow icon="mail-outline"          label="Email"          desc="Alertes par email"         value={prefs.notif_email}       onChange={setPref('notif_email')} />
              <NotifRow icon="notifications-outline" label="Push"           desc="Alertes sur l'appareil"   value={prefs.notif_push}        onChange={setPref('notif_push')} />

              <ThemedText variant="label" color="secondary" style={[styles.subTitle, { marginTop: Spacing.md }]}>Événements</ThemedText>
              <NotifRow icon="book-outline"           label="Nouveaux cours"    desc="Cours publiés"                value={prefs.notif_new_course}  onChange={setPref('notif_new_course')} />
              <NotifRow icon="document-text-outline"  label="Devoirs"           desc="Nouveaux devoirs"             value={prefs.notif_assignments} onChange={setPref('notif_assignments')} />
              <NotifRow icon="star-outline"           label="Notes"             desc="Notes publiées"               value={prefs.notif_grades}      onChange={setPref('notif_grades')} />
              <NotifRow icon="chatbubble-outline"     label="Messages"          desc="Nouveaux messages"            value={prefs.notif_messages}    onChange={setPref('notif_messages')} />
              <NotifRow icon="videocam-outline"       label="Sessions live"     desc="Début d'une session live"     value={prefs.notif_live}        onChange={setPref('notif_live')} />

              <TouchableOpacity
                onPress={handleSavePrefs}
                disabled={savingPrefs}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: savingPrefs ? 0.6 : 1, marginTop: Spacing.md }]}
              >
                {savingPrefs
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <ThemedText bold style={{ color: '#fff' }}>Sauvegarder les préférences</ThemedText>
                }
              </TouchableOpacity>
            </>
          )}
        </ThemedView>

        {/* ── Change Password ── */}
        <ThemedView variant="card" rounded="xl" elevated style={styles.section}>
          <ThemedText variant="body" bold style={styles.sectionTitle}>Changer le mot de passe</ThemedText>

          {/* Current */}
          <ThemedView variant="secondary" rounded="lg" style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput placeholder="Mot de passe actuel" placeholderTextColor={colors.textMuted}
              value={oldPw} onChangeText={setOldPw} secureTextEntry={!showOld}
              style={[styles.input, { color: colors.text }]} />
            <TouchableOpacity onPress={() => setShowOld(!showOld)}>
              <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </ThemedView>

          {/* New */}
          <ThemedView variant="secondary" rounded="lg" style={styles.inputRow}>
            <Ionicons name="lock-open-outline" size={18} color={colors.textMuted} />
            <TextInput placeholder="Nouveau mot de passe" placeholderTextColor={colors.textMuted}
              value={newPw} onChangeText={setNewPw} secureTextEntry={!showNew}
              style={[styles.input, { color: colors.text }]} />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </ThemedView>

          {/* Strength bar */}
          {newPw.length > 0 && (
            <View style={{ marginBottom: Spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strength.color : colors.border }]} />
                ))}
              </View>
              <ThemedText variant="label" style={{ color: strength.color }}>Force : {strength.label}</ThemedText>
            </View>
          )}

          {/* Confirm */}
          <ThemedView variant="secondary" rounded="lg" style={[styles.inputRow, {
            borderWidth: confirmPw && confirmPw !== newPw ? 1 : 0,
            borderColor: confirmPw && confirmPw !== newPw ? '#EF4444' : 'transparent',
          }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textMuted} />
            <TextInput placeholder="Confirmer le nouveau mot de passe" placeholderTextColor={colors.textMuted}
              value={confirmPw} onChangeText={setConfirmPw} secureTextEntry={!showConfirm}
              style={[styles.input, { color: colors.text }]} />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </ThemedView>
          {confirmPw && confirmPw !== newPw && (
            <ThemedText variant="label" style={{ color: '#EF4444', marginBottom: Spacing.sm }}>
              Les mots de passe ne correspondent pas
            </ThemedText>
          )}

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={savingPw}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: savingPw ? 0.6 : 1 }]}
          >
            {savingPw
              ? <ActivityIndicator color="#fff" size="small" />
              : <ThemedText bold style={{ color: '#fff' }}>Mettre à jour le mot de passe</ThemedText>
            }
          </TouchableOpacity>
        </ThemedView>

        {/* ── About ── */}
        <ThemedView variant="card" rounded="xl" elevated style={styles.section}>
          <ThemedText variant="body" bold style={styles.sectionTitle}>À propos</ThemedText>
          {[['Version', '1.0.0'], ['Plateforme', 'EduStream Mobile']].map(([k, v]) => (
            <View key={k} style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
              <ThemedText color="secondary">{k}</ThemedText>
              <ThemedText>{v}</ThemedText>
            </View>
          ))}
        </ThemedView>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backBtn: { marginBottom: Spacing.sm },
  section: { padding: Spacing.xl, marginBottom: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.md },
  subTitle: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  notifIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  input: { height: 44, fontSize: FontSize.base, marginLeft: Spacing.sm, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  saveBtn: { height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
});
