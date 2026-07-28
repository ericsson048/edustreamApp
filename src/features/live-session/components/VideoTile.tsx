import { View, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../components/ThemedText';

interface VideoTileProps {
  streamURL?: string;
  userName: string;
  isSelf: boolean;
  isVideoOff: boolean;
  isMuted: boolean;
  isHandRaised: boolean;
  peerStatus: string;
  presentationMode?: boolean;
  filmstrip?: boolean;
}

export function VideoTile({
  streamURL, userName, isSelf, isVideoOff, isMuted, isHandRaised, peerStatus, presentationMode, filmstrip,
}: VideoTileProps) {
  const initials = (userName || 'P').slice(0, 2).toUpperCase();
  const hasStream = !!streamURL && !isVideoOff;

  return (
    <View style={[styles.container, presentationMode && styles.containerPresentation, filmstrip && styles.containerFilmstrip]}>
      <View style={[styles.videoContainer, presentationMode && styles.videoPresentation, filmstrip && styles.videoFilmstrip]}>
        {hasStream ? (
          <RTCView streamURL={streamURL!} objectFit="cover" mirror={isSelf} style={styles.video} zOrder={0} />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.avatar}>
              <ThemedText style={styles.initials}>{initials}</ThemedText>
            </View>
          </View>
        )}

        {isHandRaised && (
          <View style={styles.handBadge}>
            <ThemedText style={styles.handIcon}>✋</ThemedText>
          </View>
        )}

        <View style={styles.bottomRow}>
          <View style={[styles.badge, isMuted ? styles.badgeMuted : styles.badgeMic]}>
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={9} color={isMuted ? '#fca5a5' : '#6ee7b7'} />
          </View>
          {!isSelf && peerStatus !== 'connected' && (
            <View style={styles.statusDotContainer}>
              <View style={[styles.statusDot, peerStatus === 'connecting' ? styles.dotConnecting : peerStatus === 'failed' ? styles.dotFailed : styles.dotIdle]} />
            </View>
          )}
        </View>

        <View style={styles.nameLabel}>
          <ThemedText style={styles.nameText} numberOfLines={1}>
            {isSelf ? 'You' : userName || 'Participant'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8, width: '100%' },
  containerPresentation: { marginBottom: 0, flex: 1 },
  containerFilmstrip: { marginBottom: 0 },
  videoContainer: {
    aspectRatio: 16 / 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  videoPresentation: { flex: 1, aspectRatio: undefined },
  videoFilmstrip: { height: '100%', aspectRatio: undefined },
  video: { flex: 1 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  initials: { color: '#fff', fontWeight: '700', fontSize: 14 },
  handBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(245,158,11,0.25)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  handIcon: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  bottomRow: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  badgeMic: { backgroundColor: 'rgba(16,185,129,0.2)' },
  badgeMuted: { backgroundColor: 'rgba(239,68,68,0.2)' },
  statusDotContainer: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotConnecting: { backgroundColor: '#f59e0b' },
  dotFailed: { backgroundColor: '#ef4444' },
  dotIdle: { backgroundColor: '#64748b' },
  nameLabel: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  nameText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },
});
