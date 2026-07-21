import { useCallback, useEffect, useState, useRef } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../src/components/ThemedText';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { Spacing } from '../../../src/theme/colors';
import { communityService, type Discussion, type DiscussionComment } from '../../../src/services/community';

export default function DiscussionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [d, cmts] = await Promise.all([
        communityService.getDiscussion(id),
        communityService.listDiscussionComments(id),
      ]);
      setDiscussion(d);
      setComments(cmts);
      setLikesCount(d.likes_count);
    } catch {} finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleLike = async () => {
    if (!id) return;
    try {
      const res = await communityService.likeDiscussion(id);
      setLikesCount(res.likes_count);
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || !id || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const comment = await communityService.createDiscussionComment(id, text);
      setComments((prev) => [...prev, comment]);
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

  const renderHeader = () => (
    <View style={{ padding: Spacing.xl, paddingBottom: Spacing.lg }}>
      <ThemedText variant="h2" bold>{discussion?.title}</ThemedText>
      {discussion?.category && (
        <View style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
          <View style={{ backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
            <ThemedText style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>{discussion.category}</ThemedText>
          </View>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm }}>
        <Ionicons name="person-circle-outline" size={16} color={colors.textMuted} />
        <ThemedText style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>{discussion?.author_name || 'Anonymous'}</ThemedText>
      </View>
      {discussion?.content && (
        <ThemedText style={{ marginTop: Spacing.md, lineHeight: 22 }}>{discussion.content}</ThemedText>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: Spacing.lg }}>
        <TouchableOpacity onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="heart-outline" size={18} color={colors.primary} />
          <ThemedText style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>{likesCount}</ThemedText>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
          <ThemedText style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>{comments.length}</ThemedText>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.border, marginTop: Spacing.lg }} />
      <ThemedText style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: Spacing.md }}>Comments ({comments.length})</ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={{ paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <ThemedText variant="h2" bold style={{ marginLeft: Spacing.sm }}>Discussion</ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ flexGrow: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
              <ThemedText style={{ color: colors.textMuted, fontSize: 11, marginLeft: 4 }}>{item.author_name || 'Anonymous'}</ThemedText>
              <ThemedText style={{ color: colors.textMuted, fontSize: 10, marginLeft: 8 }}>{new Date(item.created_at).toLocaleDateString()}</ThemedText>
            </View>
            <ThemedText style={{ fontSize: 14, lineHeight: 20 }}>{item.content}</ThemedText>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
            <ThemedText style={{ color: colors.textMuted, marginTop: Spacing.sm }}>No comments yet.</ThemedText>
          </View>
        }
      />

      <View style={{ flexDirection: 'row', gap: 8, padding: Spacing.md, paddingBottom: insets.bottom + Spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TextInput value={input} onChangeText={setInput} placeholder="Add a comment..." placeholderTextColor={colors.textMuted} style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 14 }} onSubmitEditing={handleSend} returnKeyType="send" />
        <TouchableOpacity onPress={handleSend} disabled={sending || !input.trim()} style={{ backgroundColor: sending ? colors.border : colors.primary, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', opacity: !input.trim() ? 0.5 : 1 }}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
