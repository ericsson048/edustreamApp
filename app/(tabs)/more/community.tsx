import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, TextInput, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { Spacing, BorderRadius } from '../../../src/theme/colors';
import { communityService, type Discussion, type StudyGroup } from '../../../src/services/community';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<'discussions' | 'groups'>('discussions');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [d, g] = await Promise.all([communityService.listDiscussions(), communityService.listStudyGroups()]);
      setDiscussions(d);
      setGroups(g);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      await communityService.createDiscussion({ title: newTitle.trim(), content: newContent.trim() });
      setShowNewDiscussion(false);
      setNewTitle('');
      setNewContent('');
      fetch();
    } catch {} finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || creating) return;
    setCreating(true);
    try {
      await communityService.createStudyGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() });
      setShowNewGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      fetch();
    } catch {} finally {
      setCreating(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetch(); };

  const renderDiscussion = (d: Discussion) => (
    <TouchableOpacity key={d.id} onPress={() => router.push(`/community/discussions/${d.id}`)} activeOpacity={0.7} style={{ marginBottom: Spacing.sm }}>
      <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ThemedText bold style={{ flex: 1 }} numberOfLines={1}>{d.title}</ThemedText>
          <View style={{ backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <ThemedText style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>{d.category}</ThemedText>
          </View>
        </View>
        <ThemedText style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 18 }} numberOfLines={2}>{d.content}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
          <ThemedText style={{ color: colors.textMuted, fontSize: 11 }}>{d.author_name || 'Anonymous'}</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
            <ThemedText style={{ color: colors.textMuted, fontSize: 11 }}>{d.likes_count}</ThemedText>
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );

  const renderGroup = (g: StudyGroup) => (
    <TouchableOpacity key={g.id} onPress={() => router.push(`/community/groups/${g.id}`)} activeOpacity={0.7} style={{ marginBottom: Spacing.sm }}>
      <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="people" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText bold>{g.name}</ThemedText>
            <ThemedText style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{g.description}</ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText style={{ color: colors.textMuted, fontSize: 11 }}>{g.members_count || 0} members</ThemedText>
            {g.next_session_at ? (
              <ThemedText style={{ color: colors.warning, fontSize: 10 }}>{new Date(g.next_session_at).toLocaleDateString()}</ThemedText>
            ) : null}
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText variant="h2" bold>Community</ThemedText>
          </View>
          <TouchableOpacity onPress={() => tab === 'discussions' ? setShowNewDiscussion(true) : setShowNewGroup(true)}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.md }}>
          <TouchableOpacity onPress={() => setTab('discussions')} style={{
            flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
            backgroundColor: tab === 'discussions' ? colors.primary : colors.surfaceSecondary,
          }}>
            <ThemedText style={{ color: tab === 'discussions' ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>Discussions</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('groups')} style={{
            flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
            backgroundColor: tab === 'groups' ? colors.primary : colors.surfaceSecondary,
          }}>
            <ThemedText style={{ color: tab === 'groups' ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>Study Groups</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height={90} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : tab === 'discussions' ? (
          discussions.length === 0 ? (
            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              <ThemedText style={{ color: colors.textMuted, marginTop: Spacing.md }}>No discussions yet.</ThemedText>
            </ThemedView>
          ) : discussions.map(renderDiscussion)
        ) : groups.length === 0 ? (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] }}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <ThemedText style={{ color: colors.textMuted, marginTop: Spacing.md }}>No study groups yet.</ThemedText>
          </ThemedView>
        ) : groups.map(renderGroup)}
      </ScrollView>

      {/* New Discussion Modal */}
      <Modal visible={showNewDiscussion} transparent animationType="fade" onRequestClose={() => setShowNewDiscussion(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl }} onPress={() => setShowNewDiscussion(false)}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: colors.background, borderRadius: 16, padding: Spacing.xl }}>
            <ThemedText variant="h3" bold style={{ marginBottom: Spacing.md }}>New Discussion</ThemedText>
            <TextInput placeholder="Title" placeholderTextColor="#64748b" value={newTitle} onChangeText={setNewTitle} style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 8 }} />
            <TextInput placeholder="Content (optional)" placeholderTextColor="#64748b" value={newContent} onChangeText={setNewContent} multiline style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#fff', minHeight: 80, marginBottom: Spacing.md }} />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowNewDiscussion(false)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1e293b' }}>
                <ThemedText style={{ color: '#94a3b8' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateDiscussion} disabled={creating || !newTitle.trim()} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: creating ? '#334155' : colors.primary, opacity: !newTitle.trim() ? 0.5 : 1 }}>
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{creating ? '...' : 'Post'}</ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* New Group Modal */}
      <Modal visible={showNewGroup} transparent animationType="fade" onRequestClose={() => setShowNewGroup(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl }} onPress={() => setShowNewGroup(false)}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: colors.background, borderRadius: 16, padding: Spacing.xl }}>
            <ThemedText variant="h3" bold style={{ marginBottom: Spacing.md }}>New Study Group</ThemedText>
            <TextInput placeholder="Group name" placeholderTextColor="#64748b" value={newGroupName} onChangeText={setNewGroupName} style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 8 }} />
            <TextInput placeholder="Description (optional)" placeholderTextColor="#64748b" value={newGroupDesc} onChangeText={setNewGroupDesc} multiline style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#fff', minHeight: 80, marginBottom: Spacing.md }} />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowNewGroup(false)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1e293b' }}>
                <ThemedText style={{ color: '#94a3b8' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateGroup} disabled={creating || !newGroupName.trim()} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: creating ? '#334155' : colors.primary, opacity: !newGroupName.trim() ? 0.5 : 1 }}>
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{creating ? '...' : 'Create'}</ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
