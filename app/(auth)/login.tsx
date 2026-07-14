import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAlert } from '../../src/components/AlertDialog';
import { BorderRadius, FontSize, Spacing } from '../../src/theme/colors';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const { alert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('student@edustream.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      await alert({ title: 'Error', message: e?.response?.data?.detail || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.inner, { paddingTop: insets.top + Spacing['5xl'] }]}>
        <View style={styles.top}>
          <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
            <ThemedText style={{ fontSize: 32, color: '#fff', fontWeight: '700' }}>E</ThemedText>
          </View>
          <ThemedText variant="h1" bold style={{ marginTop: Spacing['2xl'] }}>Welcome back</ThemedText>
          <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>Sign in to continue learning</ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedView variant="secondary" rounded="xl" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: colors.text }]}
            />
          </ThemedView>
          <ThemedView variant="secondary" rounded="xl" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, { color: colors.text, flex: 1 }]}
            />
            <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={{ padding: Spacing.sm }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </ThemedView>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <ThemedText variant="caption" style={{ color: colors.primary, textAlign: 'right', marginTop: Spacing.sm }}>Forgot password?</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText bold style={{ color: '#fff', fontSize: FontSize.lg }}>Sign In</ThemedText>}
          </TouchableOpacity>
        </View>

        <View style={styles.bottom}>
          <ThemedText variant="body" color="secondary">Don't have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <ThemedText variant="body" bold style={{ color: colors.primary }}>Sign Up</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedView variant="secondary" rounded="lg" style={{ marginTop: Spacing['3xl'], padding: Spacing.lg, alignItems: 'center' }}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <ThemedText variant="caption" bold style={{ marginTop: 4 }}>Demo Account</ThemedText>
          <ThemedText variant="caption" color="secondary">student@edustream.com / password123</ThemedText>
        </ThemedView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: Spacing['2xl'] },
  top: { alignItems: 'center' },
  logoWrap: { width: 64, height: 64, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  form: { marginTop: Spacing['3xl'] },
  input: { height: 50, fontSize: FontSize.base, marginLeft: Spacing.md, flex: 1 },
  button: { height: 52, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
});
