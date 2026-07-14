import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Spacing, BorderRadius } from '../../../src/theme/colors';
import { messagingService, type Conversation } from '../../../src/services/messaging';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messagingService.listConversations();
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText variant="h2" bold>{t('messages.title')}</ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
          <ThemedText style={{ color: colors.textMuted, marginTop: Spacing.md, textAlign: 'center' }}>
            {t('messages.noConversations')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/messages/${item.id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.surfaceSecondary || '#1e293b',
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primaryLight || '#1e3a5f',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name={item.is_group ? 'people' : 'person'} size={22} color={colors.primary || '#3b82f6'} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText bold style={{ color: colors.text }} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                {item.latest_message ? (
                  <ThemedText style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {item.latest_message.sender_name ? `${item.latest_message.sender_name}: ` : ''}
                    {item.latest_message.content}
                  </ThemedText>
                ) : null}
              </View>
              {item.latest_message ? (
                <ThemedText style={{ color: colors.textMuted, fontSize: 10 }}>
                  {new Date(item.latest_message.created_at).toLocaleDateString()}
                </ThemedText>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
