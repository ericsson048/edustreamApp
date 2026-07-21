import { useCallback, useEffect, useState, useRef } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../src/components/ThemedText';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { Spacing } from '../../../src/theme/colors';
import { communityService, type StudyGroup, type StudyGroupMessage } from '../../../src/services/community';

export default function StudyGroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<StudyGroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [joined, setJoined] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isMemberRef = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [g, msgs] = await Promise.all([communityService.getStudyGroup(id), communityService.listStudyGroupMessages(id)]);
      setGroup(g);
      setMessages(msgs);
      isMemberRef.current = Boolean(g.members?.length || g.members_count);
    } catch {} finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      communityService.createStudyGroupSocket(id).then((socket) => {
        if (destroyed) { socket.close(); return; }
        wsRef.current = socket;
        ws = socket;
        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.content) {
              setMessages((prev) => [...prev, { id: `ws-${Date.now()}`, group: id, sender: msg.sender || '', sender_name: msg.sender_name, content: msg.content, created_at: new Date().toISOString() }]);
            }
          } catch {}
        };
        socket.onclose = () => {
          if (!destroyed) reconnectTimer = setTimeout(connect, 3000);
        };
        socket.onerror = () => socket.close();
      }).catch(() => {
        if (!destroyed) reconnectTimer = setTimeout(connect, 3000);
      });
    };

    connect();

    return () => {
      destroyed = true;
      ws?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [id]);

  const handleJoin = async () => {
    if (!id) return;
    try {
      const res = await communityService.joinStudyGroup(id);
      setJoined(res.joined);
      isMemberRef.current = true;
      if (group) setGroup({ ...group, members_count: res.members_count });
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || !id || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const msg = await communityService.sendStudyGroupMessage(id, text);
      setMessages((prev) => [...prev, msg]);
    } catch { setInput(text); }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={{ paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText variant="h2" bold numberOfLines={1} style={{ flex: 1 }}>{group?.name || 'Group'}</ThemedText>
          </View>
          {!isMemberRef.current && !joined && (
            <TouchableOpacity onPress={handleJoin} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
              <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Join</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.md, flexGrow: 1, justifyContent: 'flex-end' }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isOwn = item.sender_name === user?.full_name;
          return (
            <View style={{ maxWidth: '80%', marginBottom: 8, padding: 10, borderRadius: 14, backgroundColor: isOwn ? colors.primary : colors.surfaceSecondary, alignSelf: isOwn ? 'flex-end' : 'flex-start', borderBottomRightRadius: isOwn ? 4 : 14, borderBottomLeftRadius: isOwn ? 14 : 4 }}>
              {!isOwn && (
                <ThemedText style={{ color: colors.primary, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>{item.sender_name || 'Member'}</ThemedText>
              )}
              <ThemedText style={{ color: isOwn ? '#fff' : colors.text, fontSize: 14 }}>{item.content}</ThemedText>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <ThemedText style={{ color: colors.textMuted, marginTop: Spacing.md }}>No messages yet.</ThemedText>
          </View>
        }
      />

      {isMemberRef.current || joined ? (
        <View style={{ flexDirection: 'row', gap: 8, padding: Spacing.md, paddingBottom: insets.bottom + Spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <TextInput value={input} onChangeText={setInput} placeholder="Type a message..." placeholderTextColor={colors.textMuted} style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 14 }} onSubmitEditing={handleSend} returnKeyType="send" />
          <TouchableOpacity onPress={handleSend} disabled={sending || !input.trim()} style={{ backgroundColor: sending ? colors.border : colors.primary, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', opacity: !input.trim() ? 0.5 : 1 }}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
