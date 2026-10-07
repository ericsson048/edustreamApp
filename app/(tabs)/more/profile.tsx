import { useState, useEffect } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAlert } from '../../../src/components/AlertDialog';
import { BorderRadius, FontSize, Spacing } from '../../../src/theme/colors';
import { apiClient } from '../../../src/services/apiClient';

// ── Stat item ────────────────────────────────────────────────────────────────
function StatItem({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Ionicons name={icon as any} size={18} color={color} style={{ marginBottom: 4 }} />
      <ThemedText style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{value}</ThemedText>
      <ThemedText variant="caption" color="secondary" style={{ textAlign: 'center', fontSize: 10 }}>{label}</ThemedText>
    </View>
  );
}

// ── Text field ────────────────────────────────────────────────────────────────
function Field({
  icon, label, value, onChangeText, multiline = false,
  placeholder = '', keyboardType = 'default' as any,
}: {
  icon: string; label: string; value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean; placeholder?: string; keyboardType?: any;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <ThemedText variant="caption" bold style={{ marginBottom: 6, color: colors.textMuted }}>{label}</ThemedText>
      <ThemedView variant="secondary" rounded="xl" style={[styles.fieldRow, multiline && { height: 88, alignItems: 'flex-start', paddingTop: Spacing.md }]}>
        <Ionicons name={icon as any} size={18} color={colors.textMuted} style={{ marginTop: multiline ? 2 : 0 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
          style={[styles.input, { color: colors.text, height: multiline ? 72 : 44, textAlignVertical: multiline ? 'top' : 'center' }]}
        />
      </ThemedView>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { alert } = useAlert();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [stats, setStats] = useState({
    courses_enrolled: 0,
    courses_completed: 0,
    certificates_count: 0,
    assignments_submitted: 0,
    quiz_attempts: 0,
    streak_days: 0,
  });

  // Sync fields when user changes
  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setTitle(user.title || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setWebsite(user.website || '');
  }, [user]);

  // Load personal stats
  useEffect(() => {
    apiClient.get('/auth/me/stats/')
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await updateUser({ full_name: fullName.trim(), title, bio, location, website });
      await alert({ title: 'Succès', message: 'Profil mis à jour.' });
    } catch {
      await alert({ title: 'Erreur', message: 'Impossible de mettre à jour le profil.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      await alert({ title: 'Permission refusée', message: "L'accès à la galerie est requis." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setAvatarLoading(true);
    try {
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);

      const { data } = await apiClient.post<{ url: string }>('/upload-image/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await updateUser({ avatar_url: data.url });
      await alert({ title: 'Succès', message: 'Photo de profil mise à jour.' });
    } catch {
      await alert({ title: 'Erreur', message: "Impossible d'uploader la photo." });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert('Supprimer la photo', 'Confirmer la suppression de la photo de profil ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await updateUser({ avatar_url: '' });
          } catch {
            await alert({ title: 'Erreur', message: 'Impossible de supprimer la photo.' });
          }
        },
      },
    ]);
  };

  const initials = user?.full_name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const avatarUri = user?.avatar_url;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Profil</ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── Avatar card ── */}
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.xl }}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={avatarLoading} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                <ThemedText style={{ fontSize: 32, color: colors.primary, fontWeight: '700' }}>{initials}</ThemedText>
              </View>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
              {avatarLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera-outline" size={14} color="#fff" />
              }
            </View>
          </TouchableOpacity>

          <ThemedText variant="h3" bold style={{ marginTop: Spacing.md }}>{user?.full_name}</ThemedText>
          {user?.title ? (
            <ThemedText variant="body" color="secondary" style={{ marginTop: 2 }}>{user.title}</ThemedText>
          ) : null}
          <ThemedText variant="caption" color="secondary">{user?.email}</ThemedText>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="school-outline" size={12} color={colors.primary} />
              <ThemedText variant="label" style={{ color: colors.primary, marginLeft: 4 }}>{user?.role}</ThemedText>
            </View>
            {avatarUri && (
              <TouchableOpacity onPress={handleRemoveAvatar} style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={12} color="#EF4444" />
                <ThemedText variant="label" style={{ color: '#EF4444', marginLeft: 4 }}>Supprimer</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ThemedView>

        {/* ── Stats row ── */}
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginBottom: Spacing.xl }}>
          <ThemedText variant="caption" bold color="secondary" style={{ marginBottom: Spacing.md }}>Statistiques</ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <StatItem icon="book-outline"       value={stats.courses_enrolled}    label="Cours"        color="#3B82F6" />
            <StatItem icon="checkmark-circle-outline" value={stats.courses_completed} label="Complétés" color="#22C55E" />
            <StatItem icon="ribbon-outline"     value={stats.certificates_count}  label="Certificats"  color="#F59E0B" />
            <StatItem icon="document-text-outline" value={stats.assignments_submitted} label="Devoirs" color="#8B5CF6" />
            <StatItem icon="flame-outline"      value={stats.streak_days}         label="Jours"        color="#F97316" />
          </View>
        </ThemedView>

        {/* ── Edit form ── */}
        <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginBottom: Spacing.xl }}>
          <ThemedText variant="body" bold style={{ marginBottom: Spacing.lg }}>Modifier le profil</ThemedText>

          <Field icon="person-outline"     label="Nom complet"           value={fullName}  onChangeText={setFullName}  placeholder="Votre nom complet" />
          <Field icon="briefcase-outline"  label="Titre professionnel"   value={title}     onChangeText={setTitle}     placeholder="ex: Développeur & Enseignant" />
          <Field icon="document-text-outline" label="Biographie"         value={bio}       onChangeText={setBio}       placeholder="Décrivez-vous..." multiline />
          <Field icon="location-outline"   label="Localisation"          value={location}  onChangeText={setLocation}  placeholder="ex: Douala, Cameroun" />
          <Field icon="globe-outline"      label="Site web"              value={website}   onChangeText={setWebsite}   placeholder="https://monsite.com" keyboardType="url" />

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>Sauvegarder</ThemedText>
                </>
            }
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backBtn: { marginBottom: Spacing.sm },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, fontSize: FontSize.base, marginLeft: Spacing.sm },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: BorderRadius.full, marginTop: Spacing.md,
  },
});
