import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { skillService, type SkillTreeData } from '../../../src/services/skills';
import { BorderRadius, Spacing } from '../../../src/theme/colors';
import { SkeletonLoader } from '../../../src/components/SkeletonLoader';

export default function SkillTreeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tree, setTree] = useState<SkillTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const trees = await skillService.listSkillTrees();
      setTree(trees.find((t) => t.is_active) || trees[0] || null);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const t = await skillService.generateSkillTree();
      setTree(t);
    } catch {} finally {
      setGenerating(false);
    }
  };

  const handleUnlock = async (nodeId: string) => {
    if (!tree) return;
    try {
      await skillService.unlockNextNode(tree.id, nodeId);
      await fetch();
    } catch {}
  };

  const completed = tree?.nodes.filter((n) => n.status === 'COMPLETED').length ?? 0;
  const unlocked = tree?.nodes.filter((n) => n.status === 'UNLOCKED').length ?? 0;

  const statusConfig = {
    COMPLETED: { icon: 'checkmark-circle' as const, color: colors.success },
    UNLOCKED: { icon: 'lock-open-outline' as const, color: colors.warning },
    LOCKED: { icon: 'lock-closed-outline' as const, color: colors.textMuted },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <ThemedText variant="h2" bold>Skill Tree</ThemedText>
            {tree && <ThemedText variant="caption" color="secondary">{tree.title}</ThemedText>}
          </View>
          {!tree && (
            <TouchableOpacity onPress={handleGenerate} disabled={generating} style={[styles.genBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="sparkles-outline" size={16} color="#fff" />
              <ThemedText bold style={{ color: '#fff', fontSize: 12, marginLeft: 4 }}>{generating ? '...' : 'Generate'}</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.primary} />}
      >
        {tree ? (
          <>
            <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl }}>
              {[
                { label: 'Completed', value: completed, icon: 'checkmark-circle' as const, color: colors.success },
                { label: 'Unlocked', value: unlocked, icon: 'lock-open-outline' as const, color: colors.warning },
                { label: 'Total', value: tree.nodes.length, icon: 'layers-outline' as const, color: colors.info },
              ].map((s) => (
                <ThemedView key={s.label} variant="card" rounded="xl" elevated style={{ flex: 1, padding: Spacing.lg, alignItems: 'center' }}>
                  <Ionicons name={s.icon} size={20} color={s.color} />
                  <ThemedText variant="h3" bold style={{ marginTop: Spacing.xs }}>{s.value}</ThemedText>
                  <ThemedText variant="caption" color="secondary">{s.label}</ThemedText>
                </ThemedView>
              ))}
            </View>

            {tree.nodes.map((node) => {
              const cfg = statusConfig[node.status] || statusConfig.LOCKED;
              return (
                <TouchableOpacity
                  key={node.id}
                  onPress={() => node.status === 'UNLOCKED' && handleUnlock(node.id)}
                  disabled={node.status !== 'UNLOCKED'}
                  activeOpacity={0.7}
                  style={{ marginBottom: Spacing.sm }}
                >
                  <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.lg, borderLeftWidth: 4, borderLeftColor: cfg.color }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.nodeIcon}>
                        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.md }}>
                        <ThemedText variant="body" bold>{node.title}</ThemedText>
                        {node.description ? (
                          <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>{node.description}</ThemedText>
                        ) : null}
                        <ThemedText variant="label" color="muted" style={{ marginTop: 4 }}>
                          Depth {node.depth} · {node.status}
                        </ThemedText>
                      </View>
                    </View>
                  </ThemedView>
                </TouchableOpacity>
              );
            })}
          </>
        ) : loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} height={80} rounded="xl" style={{ marginBottom: Spacing.md }} />)
        ) : (
          <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['5xl'] }}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="git-network-outline" size={40} color={colors.primary} />
            </View>
            <ThemedText variant="h3" bold style={{ marginTop: Spacing.lg }}>No Skill Tree Yet</ThemedText>
            <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
              Generate a personalized skill tree based on your enrolled courses using AI.
            </ThemedText>
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generating}
              style={[styles.genBtn, { backgroundColor: colors.primary, marginTop: Spacing.xl, paddingHorizontal: Spacing['2xl'] }]}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
              <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm }}>{generating ? 'Generating...' : 'Generate with AI'}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backBtn: {
    marginBottom: Spacing.sm,
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  nodeIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
