import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../src/components/ThemedText';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Spacing } from '../../../src/theme/colors';

export default function DiscussionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceSecondary || '#1e293b' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText variant="h2" bold numberOfLines={1}>Discussion</ThemedText>
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
        <ThemedText style={{ color: colors.textMuted, marginTop: Spacing.md }}>Discussion detail coming soon.</ThemedText>
      </View>
    </View>
  );
}
