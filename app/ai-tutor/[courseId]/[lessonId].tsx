import React, { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { Spacing } from '../../../src/theme/colors';
import { aiService, TutorMessage } from '../../../src/services/ai';

export default function AITutorScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  async function initConversation() {
    try {
      const conv = await aiService.createConversation({ title: 'Lesson Chat', course: courseId, lesson: lessonId });
      setConversationId(conv.id);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !conversationId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const userMsg: TutorMessage = {
      id: `temp-${Date.now()}`,
      conversation: conversationId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    try {
      const reply = await aiService.askTutor({
        conversation: conversationId,
        message: text,
        course: courseId,
        lesson: lessonId,
      });
      setMessages(prev => [...prev, reply]);
    } catch {
      const errMsg: TutorMessage = {
        id: `err-${Date.now()}`,
        conversation: conversationId,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'AI Tutor' }} />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 60 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: Spacing.md }}
            renderItem={({ item }) => (
              <View style={[
                styles.bubble,
                { backgroundColor: item.role === 'user' ? colors.primary : colors.card, alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start' },
              ]}>
                <ThemedText style={{ color: item.role === 'user' ? '#fff' : colors.text }}>{item.content}</ThemedText>
              </View>
            )}
            ListEmptyComponent={
              <ThemedText style={{ textAlign: 'center', marginTop: 40, opacity: 0.6 }}>
                Ask a question about this lesson
              </ThemedText>
            }
          />
          <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Type your question..."
              placeholderTextColor={colors.text + '66'}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!sending}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || sending}
              style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: !input.trim() || sending ? 0.5 : 1 }]}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={{ color: '#fff' }}>Send</ThemedText>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
});
