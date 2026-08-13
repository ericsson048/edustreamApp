import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoTile } from './VideoTile';
import { ThemedText } from '../../../components/ThemedText';
import { Spacing } from '../../../theme/colors';

interface Participant {
  user: string;
  user_name?: string;
  is_mic_on?: boolean;
  is_camera_on?: boolean;
  is_screen_sharing?: boolean;
  hand_raised?: boolean;
  last_reaction?: string;
}

interface VideoGridProps {
  participants: Participant[];
  remoteStreams: Record<string, string>;
  selfUserId: string;
  localStreamURL: string | null;
  screenStreamURL: string | null;
  isVideoOff: boolean;
  isMuted: boolean;
  isHandRaised: boolean;
  peerStatuses: Record<string, string>;
}

export function VideoGrid({
  participants, remoteStreams, selfUserId, localStreamURL, screenStreamURL,
  isVideoOff, isMuted, isHandRaised, peerStatuses,
}: VideoGridProps) {
  const screenW = Dimensions.get('window').width;
  const gap = Spacing.sm;

  const selfParticipant = participants.find((p) => p.user === selfUserId);
  const remoteParticipants = participants.filter((p) => p.user !== selfUserId);
  const visibleParticipants = selfParticipant ? [selfParticipant, ...remoteParticipants] : remoteParticipants;

  const screenSharer = participants.find((p) => p.is_screen_sharing);
  const isPresentationMode = !!screenSharer;
  const isSelfSharing = screenSharer?.user === selfUserId;

  if (isPresentationMode) {
    const filmstrip = participants.filter((p) => p.user !== screenSharer!.user);
    const mainStreamURL = isSelfSharing
      ? (screenStreamURL || undefined)
      : remoteStreams[screenSharer!.user];

    const gridCount = filmstrip.length + (selfParticipant ? 1 : 0);
    const tileW = gridCount <= 1 ? screenW - Spacing.xl * 2 : (screenW - Spacing.xl * 2 - gap) / 2;

    return (
      <View style={styles.presentationContainer}>
        <View style={styles.presentationMain}>
          <VideoTile
            streamURL={mainStreamURL}
            userName={screenSharer!.user_name || 'Participant'}
            isSelf={isSelfSharing}
            isVideoOff={!screenSharer!.is_camera_on}
            isMuted={!screenSharer!.is_mic_on}
            isHandRaised={!!screenSharer!.hand_raised}
            peerStatus={peerStatuses[screenSharer!.user] || 'connected'}
            presentationMode
          />
          <View style={styles.presenterBadge}>
            <Ionicons name="monitor-outline" size={12} color="#60a5fa" />
            <ThemedText style={styles.presenterText}>
              {isSelfSharing ? 'You are sharing' : `${screenSharer!.user_name || 'Participant'} is sharing`}
            </ThemedText>
          </View>
        </View>

        {filmstrip.length > 0 && (
          <View style={styles.presentationGrid}>
            {selfParticipant && (
              <View style={[styles.gridTile, { width: tileW }]}>
                <VideoTile
                  streamURL={localStreamURL || undefined}
                  userName={selfParticipant.user_name || 'You'}
                  isSelf
                  isVideoOff={isVideoOff}
                  isMuted={isMuted}
                  isHandRaised={isHandRaised}
                  peerStatus="connected"
                />
              </View>
            )}

            {filmstrip.map((p) => {
              const streamURL = p.user === selfUserId ? (localStreamURL || undefined) : remoteStreams[p.user];
              const isSelf = p.user === selfUserId;
              return (
                <View key={p.user} style={[styles.gridTile, { width: tileW }]}>
                  <VideoTile
                    streamURL={streamURL}
                    userName={isSelf ? 'You' : (p.user_name || 'Participant')}
                    isSelf={isSelf}
                    isVideoOff={isSelf ? isVideoOff : !p.is_camera_on}
                    isMuted={isSelf ? isMuted : !p.is_mic_on}
                    isHandRaised={isSelf ? isHandRaised : !!p.hand_raised}
                    peerStatus={isSelf ? 'connected' : (peerStatuses[p.user] || 'idle')}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  const count = visibleParticipants.length;
  const tileW = count <= 1 ? screenW - Spacing.xl * 2 : (screenW - Spacing.xl * 2 - gap) / 2;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {count > 0 ? (
        <View style={styles.grid}>
          {visibleParticipants.map((p) => {
            const isSelf = p.user === selfUserId;
            const streamURL = isSelf ? (localStreamURL || undefined) : remoteStreams[p.user];

            return (
              <View key={p.user} style={[styles.gridTile, { width: tileW }]}>
                <VideoTile
                  streamURL={streamURL}
                  userName={isSelf ? (selfParticipant?.user_name || 'You') : (p.user_name || 'Participant')}
                  isSelf={isSelf}
                  isVideoOff={isSelf ? isVideoOff : !p.is_camera_on}
                  isMuted={isSelf ? isMuted : !p.is_mic_on}
                  isHandRaised={isSelf ? isHandRaised : !!p.hand_raised}
                  peerStatus={isSelf ? 'connected' : (peerStatuses[p.user] || 'idle')}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.waiting}>
          <VideoTile streamURL={undefined} userName="" isSelf isVideoOff isMuted isHandRaised={false} peerStatus="connected" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  gridTile: { marginBottom: Spacing.xs },
  waiting: { alignItems: 'center', marginTop: Spacing['3xl'] },
  presentationContainer: { flex: 1, padding: Spacing.md },
  presentationMain: { flex: 1, position: 'relative' },
  presentationGrid: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
  },
  presenterBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  presenterText: { color: '#60a5fa', fontSize: 11, fontWeight: '600' },
});
