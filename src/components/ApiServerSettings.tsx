import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useAlert } from './AlertDialog';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../theme/colors';
import { getApiBaseUrl, initializeApiBaseUrl, setApiBaseUrl, testApiServerConnection } from '../services/apiClient';

export function ApiServerSettings() {
  const { colors } = useTheme();
  const { alert } = useAlert();
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [testedUrl, setTestedUrl] = useState('');
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    initializeApiBaseUrl()
      .then(() => setServerUrl(getApiBaseUrl()))
      .catch(async () => {
        await alert({ title: 'Erreur', message: 'Impossible de charger l’adresse du serveur enregistrée.' });
      })
      .finally(() => setLoading(false));
  }, [alert]);

  const handleTestConnection = async () => {
    setChecking(true);
    setTestedUrl('');
    setConnectionError('');
    try {
      await testApiServerConnection(serverUrl);
      setTestedUrl(serverUrl.trim());
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'La connexion au serveur a échoué.');
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (testedUrl !== serverUrl.trim()) {
      await alert({ title: 'Test nécessaire', message: 'Testez la connexion avec cette adresse avant de l’enregistrer.' });
      return;
    }
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
          onChangeText={(value) => {
            setServerUrl(value);
            setTestedUrl('');
            setConnectionError('');
          }}
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
        onPress={handleTestConnection}
        disabled={loading || saving || checking || !serverUrl.trim()}
        style={[styles.testButton, { borderColor: colors.primary, opacity: loading || saving || checking ? 0.6 : 1 }]}
      >
        {checking
          ? <ActivityIndicator color={colors.primary} size="small" />
          : <Ionicons name="wifi-outline" size={18} color={colors.primary} />}
        <ThemedText bold style={{ color: colors.primary, marginLeft: Spacing.sm }}>
          {checking ? 'Test de connexion…' : 'Tester la connexion'}
        </ThemedText>
      </TouchableOpacity>
      {testedUrl === serverUrl.trim() ? (
        <ThemedText accessibilityLiveRegion="polite" variant="label" style={[styles.connectionStatus, { color: '#16a34a' }]}>
          Serveur accessible. Vous pouvez enregistrer cette adresse.
        </ThemedText>
      ) : connectionError ? (
        <ThemedText accessibilityLiveRegion="polite" variant="label" style={[styles.connectionStatus, { color: colors.error }]}>
          {connectionError}
        </ThemedText>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleSave}
        disabled={loading || saving || checking || testedUrl !== serverUrl.trim()}
        style={[styles.saveButton, { backgroundColor: colors.primary, opacity: loading || saving || checking || testedUrl !== serverUrl.trim() ? 0.6 : 1 }]}
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
  testButton: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  connectionStatus: { marginBottom: Spacing.md },
  saveButton: {
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
