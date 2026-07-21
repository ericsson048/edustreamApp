import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import { useNetwork } from '../contexts/NetworkContext';

export function OfflineBanner() {
  const { isConnected } = useNetwork();
  const { colors } = useTheme();

  if (isConnected) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.error }]}>
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>No internet connection</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});
