import { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ThemedText } from '../../src/components/ThemedText';
import { useTheme } from '../../src/contexts/ThemeContext';
import { scheduleService, type LiveSession } from '../../src/services/schedule';
import { Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { useAlert } from '../../src/components/AlertDialog';
import { BASE_URL } from '../../src/services/apiClient';
import { PreJoinCard } from '../../src/features/live-session/PreJoinCard';
import { NativeRoomView } from '../../src/features/live-session/NativeRoomView';
import { liveSessionStyles as styles } from '../../src/features/live-session/styles';

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || BASE_URL).replace('/api/v1', '');
const AUTH_TOKEN_KEY = 'edustream_access_token';

export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAlert();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    scheduleService
      .getSession(id)
      .then((data) => { if (isMounted) setSession(data); })
      .catch(() => { if (isMounted) router.back(); })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    SecureStore.getItemAsync(AUTH_TOKEN_KEY).then((t) => {
      if (isMounted && t) setAuthToken(t);
    });
    return () => { isMounted = false; };
  }, []);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await scheduleService.joinSession(id);
      setJoined(true);
    } catch {
      await alert({ title: 'Error', message: 'Could not join session. You must be enrolled in the course.' });
    } finally {
      setJoining(false);
    }
  };

  if (inRoom && session) {
    return (
      <NativeRoomView
        title={session.title}
        sessionId={id}
        wsHost={API_ORIGIN.replace(/^https?:\/\//, '')}
        authToken={authToken}
        onLeave={() => setInRoom(false)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, padding: Spacing.xl }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <SkeletonLoader height={200} rounded="xl" />
            <SkeletonLoader height={30} rounded="lg" style={{ marginTop: Spacing.lg, width: '70%' }} />
          </View>
        ) : session ? (
          <PreJoinCard
            session={session}
            colors={colors}
            joining={joining}
            joined={joined}
            onJoin={handleJoin}
            onEnterRoom={() => setInRoom(true)}
          />
        ) : null}
      </View>
    </View>
  );
}
