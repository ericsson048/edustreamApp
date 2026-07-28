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
  isVideoOff: boolean;
  isMuted: boolean;
  isHandRaised: boolean;
  peerStatuses: Record<string, string>;
}

export function VideoGrid({
  participants, remoteStreams, selfUserId, localStreamURL,
  isVideoOff, isMuted, isHandRaised, peerStatuses,
}: VideoGridProps) {
  const screenW = Dimensions.get('window').width;
  const gap = Spacing.sm;

  const selfParticipant = participants.find((p) => p.user === selfUserId);
  const remoteParticipants = participants.filter((p) => p.user !== selfUserId);

  const screenSharer = participants.find((p) => p.is_screen_sharing);
  const isPresentationMode = !!screenSharer;
  const isSelfSharing = screenSharer?.user === selfUserId;

  if (isPresentationMode) {
    const filmstrip = participants.filter((p) => p.user !== screenSharer!.user);
    const filmstripTileW = 100;
    const mainStreamURL = isSelfSharing
      ? (localStreamURL || undefined)
      : remoteStreams[screenSharer!.user];

    return (
      <View style={styles.presentationContainer}>
        {/* Main large view */}
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

        {/* Filmstrip at bottom */}
        {filmstrip.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filmstrip} contentContainerStyle={styles.filmstripContent}>
            {filmstrip.map((p) => {
              const streamURL = p.user === selfUserId ? (localStreamURL || undefined) : remoteStreams[p.user];
              const isSelf = p.user === selfUserId;
              return (
                <View key={p.user} style={[styles.filmstripTile, { width: filmstripTileW }]}>
                  <VideoTile
                    streamURL={streamURL}
                    userName={isSelf ? 'You' : (p.user_name || 'Participant')}
                    isSelf={isSelf}
                    isVideoOff={isSelf ? isVideoOff : !p.is_camera_on}
                    isMuted={isSelf ? isMuted : !p.is_mic_on}
                    isHandRaised={isSelf ? isHandRaised : !!p.hand_raised}
                    peerStatus={isSelf ? 'connected' : (peerStatuses[p.user] || 'idle')}
                    filmstrip
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  const count = participants.length;
  const cols = count <= 1 ? 1 : count <= 2 ? 2 : 2;
  const tileW = cols === 1 ? screenW - Spacing.xl * 2 : (screenW - Spacing.xl * 2 - gap) / 2;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {selfParticipant && (
        <View style={[styles.selfTile, { width: tileW }]}>
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

      {remoteParticipants.length > 0 && (
        <View style={styles.grid}>
          {remoteParticipants.map((p) => (
            <View key={p.user} style={[styles.gridTile, { width: tileW }]}>
              <VideoTile
                streamURL={remoteStreams[p.user]}
                userName={p.user_name || 'Participant'}
                isSelf={false}
                isVideoOff={!p.is_camera_on}
                isMuted={!p.is_mic_on}
                isHandRaised={!!p.hand_raised}
                peerStatus={peerStatuses[p.user] || 'idle'}
              />
            </View>
          ))}
        </View>
      )}

      {count <= 1 && (
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
  selfTile: { alignSelf: 'center', marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridTile: {},
  waiting: { alignItems: 'center', marginTop: Spacing['3xl'] },
  presentationContainer: { flex: 1, padding: Spacing.md },
  presentationMain: { flex: 1, position: 'relative' },
  presenterBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  presenterText: { color: '#60a5fa', fontSize: 11, fontWeight: '600' },
  filmstrip: { marginTop: Spacing.sm, maxHeight: 110 },
  filmstripContent: { gap: Spacing.xs, paddingRight: Spacing.md },
  filmstripTile: { height: 100 },
});
