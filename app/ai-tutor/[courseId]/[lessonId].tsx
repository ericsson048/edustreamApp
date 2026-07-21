import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { MarkdownRenderer } from '../../../src/components/MarkdownRenderer';
import { useAlert } from '../../../src/components/AlertDialog';
import { Spacing } from '../../../src/theme/colors';
import { aiService, type ChatMessage, type ConversationItem } from '../../../src/services/ai';
import { playerService } from '../../../src/services/player';

export default function AITutorScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { confirm } = useAlert();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConvList, setShowConvList] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  async function loadConversations() {
    try {
      const [list, lesson] = await Promise.all([
        aiService.listConversations(),
        playerService.getLesson(lessonId).catch(() => null),
      ]);
      setConversations(list);
      setLessonTitle(lesson?.title || '');
      setLessonContent(lesson?.content || '');
      if (list.length > 0) {
        setActiveConvId(list[0].id);
        loadMessages(list[0].id);
      } else {
        const conv = await aiService.createConversation(lesson?.title ? `Lesson: ${lesson.title}` : undefined);
        setConversations([conv]);
        setActiveConvId(conv.id);
      }
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(convId: string) {
    try {
      const items = await aiService.listMessages(convId);
      const chat: ChatMessage[] = [];
      items.forEach((m) => {
        chat.push({ id: `${m.id}-user`, role: 'user', content: m.prompt, created_at: m.created_at });
        chat.push({ id: `${m.id}-ai`, role: 'assistant', content: m.response, created_at: m.created_at });
      });
      setMessages(chat);
    } catch {}
  }

  const switchConversation = useCallback((convId: string) => {
    setActiveConvId(convId);
    setMessages([]);
    loadMessages(convId);
    setShowConvList(false);
  }, []);

  async function handleNewConversation() {
    try {
      const conv = await aiService.createConversation(lessonTitle ? `Lesson: ${lessonTitle}` : undefined);
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setTotalTokens(0);
      setShowConvList(false);
    } catch {}
  }

  async function handleDeleteConversation(convId: string) {
    const ok = await confirm({ title: 'Delete conversation', message: 'Are you sure?', confirm: true });
    if (!ok) return;
    try {
      await aiService.deleteConversation(convId);
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);
      if (activeConvId === convId) {
        if (updated.length > 0) {
          setActiveConvId(updated[0].id);
          loadMessages(updated[0].id);
        } else {
          const conv = await aiService.createConversation(lessonTitle ? `Lesson: ${lessonTitle}` : undefined);
          setConversations([conv]);
          setActiveConvId(conv.id);
          setMessages([]);
          setTotalTokens(0);
        }
      }
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim() || !activeConvId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const userMsg: ChatMessage = { id: `temp-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() };
    const prevMessages = messages;
    setMessages((prev) => [...prev, userMsg]);
    try {
      const needsContext = prevMessages.length === 0 && lessonContent;
      const prompt = needsContext
        ? `Lesson content:\n${lessonContent.slice(0, 3000)}\n\n---\nStudent question: ${text}`
        : text;
      const history = prevMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const data = await aiService.askTutor(prompt, activeConvId, history);
      const reply: ChatMessage = {
        id: `reply-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        usage: data.usage,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
      const usageTokens = data.usage;
      if (usageTokens) setTotalTokens((prev) => prev + usageTokens.total_tokens);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant', content: 'Sorry, I encountered an error processing your question.', created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'AI Tutor' }} />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 60 }} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
          {/* Conversation header */}
          <View style={[styles.convHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowConvList(!showConvList)} style={styles.convSelector}>
              <ThemedText variant="body" bold numberOfLines={1} style={{ flex: 1 }}>
                {activeConv?.title || 'AI Tutor'}
              </ThemedText>
              <Ionicons name={showConvList ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewConversation} style={styles.convAction}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Conversation list dropdown */}
          {showConvList && (
            <View style={[styles.convList, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              {conversations.length === 0 ? (
                <ThemedText variant="caption" color="secondary" style={{ padding: Spacing.md, textAlign: 'center' }}>
                  No conversations yet
                </ThemedText>
              ) : (
                conversations.map((conv) => (
                  <TouchableOpacity
                    key={conv.id}
                    onPress={() => switchConversation(conv.id)}
                    style={[styles.convItem, activeConvId === conv.id && { backgroundColor: colors.primaryLight }]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="body" bold={activeConvId === conv.id} numberOfLines={1}>
                        {conv.title}
                      </ThemedText>
                      <ThemedText variant="caption" color="secondary">
                        {conv.message_count} messages
                      </ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteConversation(conv.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.lg }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={[
                styles.bubble,
                {
                  backgroundColor: item.role === 'user' ? colors.primary : colors.surface,
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                },
              ]}>
                {item.role === 'user' ? (
                  <ThemedText style={{ color: '#fff', flexShrink: 1 }}>{item.content}</ThemedText>
                ) : (
                  <MarkdownRenderer content={item.content} />
                )}
                {item.usage && (
                  <ThemedText variant="caption" color="secondary" style={{ marginTop: 4, fontSize: 10, opacity: 0.6 }}>
                    {item.usage.total_tokens} tokens
                  </ThemedText>
                )}
              </View>
            )}
            ListEmptyComponent={
              <ThemedText style={{ textAlign: 'center', marginTop: 40, opacity: 0.6 }}>
                Ask a question about this lesson
              </ThemedText>
            }
          />

          {/* Token usage bar */}
          {totalTokens > 0 && (
            <View style={[styles.tokenBar, { backgroundColor: colors.surfaceTertiary }]}>
              <ThemedText variant="caption" color="secondary" style={{ fontSize: 10, textAlign: 'center' }}>
                Total tokens used: {totalTokens}
              </ThemedText>
            </View>
          )}

          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
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
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  convSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  convAction: {
    padding: 4,
    marginLeft: Spacing.sm,
  },
  convList: {
    maxHeight: 200,
    borderBottomWidth: 1,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tokenBar: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.md,
  },
  bubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
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
