import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useAlert } from './AlertDialog';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../theme/colors';
import { getApiBaseUrl, initializeApiBaseUrl, setApiBaseUrl } from '../services/apiClient';

export function ApiServerSettings() {
  const { colors } = useTheme();
  const { alert } = useAlert();
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initializeApiBaseUrl()
      .then(() => setServerUrl(getApiBaseUrl()))
      .catch(async () => {
        await alert({ title: 'Erreur', message: 'Impossible de charger l’adresse du serveur enregistrée.' });
      })
      .finally(() => setLoading(false));
  }, [alert]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setApiBaseUrl(serverUrl);
      setServerUrl(getApiBaseUrl());
      await alert({ title: 'Succès', message: 'Adresse du serveur enregistrée.' });
    } catch (error) {
      await alert({
        title: 'Adresse invalide',
        message: error instanceof Error ? error.message : 'Impossible d’enregistrer cette adresse.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView variant="card" rounded="xl" elevated style={styles.section}>
      <ThemedText variant="body" bold style={styles.title}>Adresse du serveur</ThemedText>
      <ThemedText variant="label" color="secondary" style={styles.description}>
        Modifiez l’adresse du backend sans générer un nouvel APK. Saisissez l’adresse IP de l’ordinateur avec le port 8100.
      </ThemedText>
      <ThemedView variant="secondary" rounded="lg" style={styles.inputRow}>
        <Ionicons name="server-outline" size={18} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Adresse de l’API"
          placeholder="http://192.168.1.20:8100/api/v1"
          placeholderTextColor={colors.textMuted}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!loading && !saving}
          style={[styles.input, { color: colors.text }]}
        />
      </ThemedView>
      <ThemedText variant="label" color="secondary" style={styles.hint}>
        Le téléphone et l’ordinateur doivent être connectés au même réseau Wi-Fi. Vous pouvez saisir l’adresse avec ou sans /api/v1.
      </ThemedText>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleSave}
        disabled={loading || saving}
        style={[styles.saveButton, { backgroundColor: colors.primary, opacity: loading || saving ? 0.6 : 1 }]}
      >
        {loading || saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <ThemedText bold style={{ color: '#fff' }}>Enregistrer l’adresse</ThemedText>}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: { padding: Spacing.xl, marginBottom: Spacing.lg },
  title: { marginBottom: Spacing.sm },
  description: { marginBottom: Spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md },
  input: { height: 46, fontSize: FontSize.base, marginLeft: Spacing.sm, flex: 1 },
  hint: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  saveButton: {
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
