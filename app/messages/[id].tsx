import { useEffect, useState, useRef, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../src/components/ThemedText';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Spacing } from '../../src/theme/colors';
import { messagingService, type Message } from '../../src/services/messaging';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const data = await messagingService.listMessages(id);
      setMessages(data);
      await messagingService.markConversationRead(id);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!id) return;
    let ws: WebSocket | null = null;
    messagingService.createConversationSocket(id).then((socket) => {
      wsRef.current = socket;
      ws = socket;
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.content) {
            setMessages((prev) => [...prev, { id: `ws-${Date.now()}`, conversation: id, sender_name: msg.sender_name, content: msg.content, created_at: new Date().toISOString() }]);
          }
        } catch {}
      };
    }).catch(() => undefined);
    return () => { ws?.close(); };
  }, [id]);

  const handleSend = async () => {
    if (!input.trim() || !id || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const msg = await messagingService.sendMessage(id, text);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={{ paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText variant="h2" bold numberOfLines={1}>{t('messages.title')}</ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.md, flexGrow: 1, justifyContent: 'flex-end' }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isOwn = item.sender_name === user?.full_name;
            return (
              <View style={{
                maxWidth: '80%',
                marginBottom: 8,
                padding: 10,
                borderRadius: 14,
                backgroundColor: isOwn ? colors.primary : colors.surfaceSecondary,
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                borderBottomRightRadius: isOwn ? 4 : 14,
                borderBottomLeftRadius: isOwn ? 14 : 4,
              }}>
                {!isOwn && (
                  <ThemedText style={{ color: colors.primary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>
                    {item.sender_name || 'Participant'}
                  </ThemedText>
                )}
                <ThemedText style={{ color: isOwn ? '#fff' : colors.text, fontSize: 14 }}>{item.content}</ThemedText>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText style={{ color: colors.textMuted }}>{t('messages.noConversations')}</ThemedText>
            </View>
          }
        />
      )}

      <View style={{
        flexDirection: 'row',
        gap: 8,
        padding: Spacing.md,
        paddingBottom: insets.bottom + Spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('messages.typeMessage')}
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: colors.text,
            fontSize: 14,
          }}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={{
            backgroundColor: sending ? colors.border : colors.primary,
            borderRadius: 14,
            paddingHorizontal: 16,
            justifyContent: 'center',
            opacity: !input.trim() ? 0.5 : 1,
          }}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
