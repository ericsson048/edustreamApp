import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAlert } from '../../src/components/AlertDialog';
import { BorderRadius, FontSize, Spacing } from '../../src/theme/colors';
import { authService } from '../../src/services/auth';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { alert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) return;
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      await alert({ title: 'Error', message: 'Could not send reset email' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + Spacing['5xl'] }]}>
      <View style={styles.inner}>
        <View style={[styles.logoWrap, { backgroundColor: colors.primaryLight, alignSelf: 'center' }]}>
          <Ionicons name="key-outline" size={32} color={colors.primary} />
        </View>
        <ThemedText variant="h1" bold style={{ marginTop: Spacing.xl, textAlign: 'center' }}>Reset Password</ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
          {sent ? 'Check your email for the reset link.' : 'Enter your email to receive a reset link.'}
        </ThemedText>

        {!sent ? (
          <>
            <ThemedView variant="secondary" rounded="xl" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing['2xl'] }}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                style={[styles.input, { color: colors.text }]}
              />
            </ThemedView>
            <TouchableOpacity onPress={handleSend} style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}>
              <ThemedText bold style={{ color: '#fff', fontSize: FontSize.lg }}>Send Reset Link</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}>
            <ThemedText bold style={{ color: '#fff', fontSize: FontSize.lg }}>Back to Sign In</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: Spacing['2xl'] },
  logoWrap: { width: 64, height: 64, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  input: { height: 50, fontSize: FontSize.base, marginLeft: Spacing.md, flex: 1 },
  button: { height: 52, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
});
