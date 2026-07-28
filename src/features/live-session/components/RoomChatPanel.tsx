import { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../../../theme/colors';

interface ChatMessage {
  id: string;
  sender_id?: string;
  sender_name?: string;
  content: string;
  kind: 'chat' | 'system';
}

interface ChatPanelProps {
  messages: ChatMessage[];
  visible: boolean;
  selfUserId?: string;
  onClose: () => void;
  onSend: (content: string) => void;
}

export function ChatPanel({ messages, visible, selfUserId, onClose, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, slideAnim]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { bottom: insets.bottom + 64 }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText bold style={styles.headerTitle}>Chat</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.length === 0 && (
            <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
          )}
          {messages.map((msg) => {
            const isSelf = msg.sender_id && msg.sender_id === selfUserId;
            return (
              <View key={msg.id} style={[styles.msgBubble, msg.kind === 'system' && styles.msgSystem, isSelf && styles.msgSelf]}>
                {msg.kind !== 'system' && (
                  <ThemedText style={[styles.msgSender, isSelf && styles.msgSenderSelf]}>{isSelf ? 'You' : (msg.sender_name || 'Participant')}</ThemedText>
                )}
                <ThemedText style={[styles.msgText, msg.kind === 'system' && styles.msgSystemText]}>
                  {msg.content}
                </ThemedText>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#64748b"
            style={styles.input}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 0, right: 0, top: 80, zIndex: 20,
  },
  panel: {
    flex: 1, marginHorizontal: 8,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  closeBtn: { padding: 4 },
  messages: { flex: 1, maxHeight: 300 },
  messagesContent: { padding: Spacing.md },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 24, fontSize: 13 },
  msgBubble: {
    marginBottom: 8, padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'flex-start', maxWidth: '85%',
  },
  msgSelf: { backgroundColor: 'rgba(79,70,229,0.4)', alignSelf: 'flex-end' },
  msgSystem: { backgroundColor: 'rgba(245,158,11,0.1)', alignSelf: 'center' },
  msgSender: { color: '#818cf8', fontSize: 10, fontWeight: '700', marginBottom: 2 },
  msgSenderSelf: { color: '#a5b4fc' },
  msgText: { color: '#e2e8f0', fontSize: 13 },
  msgSystemText: { color: '#fbbf24', fontSize: 11 },
  inputRow: {
    flexDirection: 'row', gap: 8, padding: Spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    color: '#fff', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sendBtn: {
    backgroundColor: '#4f46e5', borderRadius: 16, width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
});
