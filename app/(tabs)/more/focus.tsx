import { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Audio } from 'expo-audio';
import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { focusService } from '../../../src/services/focus';
import { BorderRadius, FontSize, Spacing } from '../../../src/theme/colors';

const WORK = 25 * 60;
const BREAK = 5 * 60;

const SOUNDS = [
  { id: 'rain', name: 'Rain', icon: 'rainy-outline' as const },
  { id: 'fire', name: 'Fire', icon: 'flame-outline' as const },
  { id: 'cafe', name: 'Cafe', icon: 'cafe-outline' as const },
  { id: 'lofi', name: 'Lo-Fi', icon: 'musical-notes-outline' as const },
];

const SOUND_URLS: Record<string, string> = {
  rain: 'https://cdn.freesound.org/previews/531/531946_1648170-lq.mp3',
  fire: 'https://cdn.freesound.org/previews/423/423291_10975223-lq.mp3',
  cafe: 'https://cdn.freesound.org/previews/434/434895_12799143-lq.mp3',
  lofi: 'https://cdn.freesound.org/previews/527/527400_11542807-lq.mp3',
};

export default function FocusScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [timeLeft, setTimeLeft] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    focusService.getStats().then((data) => {
      setTotalMinutes(data.total_focus_minutes ?? 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const toggleAmbient = useCallback(async (id: string) => {
    if (activeSound === id) {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setActiveSound(null);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri: SOUND_URLS[id] },
        { isLooping: true, volume: 0.4, shouldPlay: true },
      );
      soundRef.current = sound;
      setActiveSound(id);
    } catch {
      setActiveSound(null);
    }
  }, [activeSound]);

  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        const mode = isWork ? 'WORK' : 'BREAK';
        const dur = isWork ? WORK - prev : BREAK - prev;
        focusService.createSession({ duration_seconds: dur || WORK, mode }).catch(() => {});
        setIsWork(!isWork);
        return isWork ? BREAK : WORK;
      }
      return prev - 1;
    });
  }, [isWork]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const toggle = () => setRunning((p) => !p);
  const reset = () => { setRunning(false); setTimeLeft(isWork ? WORK : BREAK); };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = isWork ? ((WORK - timeLeft) / WORK) * 100 : ((BREAK - timeLeft) / BREAK) * 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText variant="h2" bold>Focus Room</ThemedText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
        <ThemedView variant="card" rounded="2xl" elevated style={{ width: '100%', alignItems: 'center', padding: Spacing['3xl'] }}>
          <View style={[styles.modeBadge, { backgroundColor: isWork ? colors.primaryLight : colors.success + '20' }]}>
            <Ionicons name={isWork ? 'timer-outline' : 'cafe-outline'} size={16} color={isWork ? colors.primary : colors.success} />
            <ThemedText variant="label" style={{ color: isWork ? colors.primary : colors.success, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {isWork ? 'Focus Time' : 'Break'}
            </ThemedText>
          </View>

          <View style={{ flexDirection: 'row', marginTop: Spacing['2xl'] }}>
            <ThemedText style={{ fontSize: 64, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
              {String(minutes).padStart(2, '0')}
            </ThemedText>
            <ThemedText style={{ fontSize: 64, fontWeight: '700', color: colors.text }}>:</ThemedText>
            <ThemedText style={{ fontSize: 64, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
              {String(seconds).padStart(2, '0')}
            </ThemedText>
          </View>

          <View style={[styles.progressBg, { backgroundColor: colors.surfaceSecondary, marginTop: Spacing.xl, width: '80%' }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: isWork ? colors.primary : colors.success }]} />
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing['2xl'] }}>
            <TouchableOpacity onPress={toggle} style={[styles.btn, { backgroundColor: colors.primary }]}>
              <Ionicons name={running ? 'pause' : 'play'} size={20} color="#fff" />
              <ThemedText bold style={{ color: '#fff', fontSize: FontSize.base, marginLeft: Spacing.sm }}>
                {running ? 'Pause' : 'Start'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={reset} style={[styles.btn, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}>
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
              <ThemedText bold style={{ color: colors.textSecondary, marginLeft: Spacing.sm }}>Reset</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        <ThemedView variant="card" rounded="xl" elevated style={{ width: '100%', padding: Spacing.xl, marginTop: Spacing.lg, flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <ThemedText variant="h3" bold style={{ marginTop: Spacing.sm }}>{totalMinutes}</ThemedText>
            <ThemedText variant="caption" color="secondary">Total min</ThemedText>
          </View>
        </ThemedView>

        <ThemedView variant="card" rounded="xl" elevated style={{ width: '100%', padding: Spacing.xl, marginTop: Spacing.lg }}>
          <ThemedText variant="caption" bold color="secondary" style={{ textAlign: 'center', marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 }}>
            Ambient Sounds
          </ThemedText>
          <View style={styles.soundGrid}>
            {SOUNDS.map((sound) => (
              <TouchableOpacity
                key={sound.id}
                onPress={() => toggleAmbient(sound.id)}
                style={[
                  styles.soundBtn,
                  {
                    backgroundColor: activeSound === sound.id ? colors.primary + '20' : colors.surfaceSecondary,
                    borderColor: activeSound === sound.id ? colors.primary + '40' : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={sound.icon as any}
                  size={24}
                  color={activeSound === sound.id ? colors.primary : colors.textSecondary}
                />
                <ThemedText variant="caption" style={{ color: activeSound === sound.id ? colors.primary : colors.textSecondary, marginTop: 4 }}>
                  {sound.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>
      </View>
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
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.full,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  soundBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    minWidth: 72,
  },
});
