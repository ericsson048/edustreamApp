import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAlert } from '../../src/components/AlertDialog';
import { BorderRadius, FontSize, Spacing } from '../../src/theme/colors';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register } = useAuth();
  const { alert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) return;
    setLoading(true);
    try {
      await register({ email, full_name: name, role: 'STUDENT', password });
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      await alert({ title: 'Error', message: e?.response?.data?.detail || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.inner, { paddingTop: insets.top + Spacing['5xl'] }]}>
        <View style={styles.top}>
          <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
            <ThemedText style={{ fontSize: 28, color: '#fff', fontWeight: '700' }}>E</ThemedText>
          </View>
          <ThemedText variant="h1" bold style={{ marginTop: Spacing.xl }}>Create Account</ThemedText>
          <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>Start your learning journey</ThemedText>
        </View>

        <View style={styles.form}>
          {([
            { icon: 'person-outline' as const, key: 'Full Name', value: name, onChange: setName, autoCap: 'words' as const, secure: false },
            { icon: 'mail-outline' as const, key: 'Email', value: email, onChange: setEmail, autoCap: 'none' as const, secure: false },
            { icon: 'lock-closed-outline' as const, key: 'Password', value: password, onChange: setPassword, autoCap: 'words' as const, secure: true },
          ]).map(({ icon, key, value, onChange, autoCap, secure }) => (
            <ThemedView key={key} variant="secondary" rounded="xl" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
              <Ionicons name={icon} size={20} color={colors.textMuted} />
              <TextInput
                placeholder={key}
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={onChange}
                autoCapitalize={autoCap}
                secureTextEntry={secure && !showPassword}
                style={[styles.input, { color: colors.text, flex: 1 }]}
              />
              {secure && (
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={{ padding: Spacing.sm }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </ThemedView>
          ))}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText bold style={{ color: '#fff', fontSize: FontSize.lg }}>Create Account</ThemedText>}
          </TouchableOpacity>
        </View>

        <View style={styles.bottom}>
          <ThemedText variant="body" color="secondary">Already have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText variant="body" bold style={{ color: colors.primary }}>Sign In</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['5xl'] },
  top: { alignItems: 'center' },
  logoWrap: { width: 56, height: 56, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  form: { marginTop: Spacing['3xl'] },
  input: { height: 50, fontSize: FontSize.base, marginLeft: Spacing.md },
  button: { height: 52, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
});
