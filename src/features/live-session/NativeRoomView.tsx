import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { ThemedText } from '../../components/ThemedText';
import { Spacing } from '../../theme/colors';
import { VideoGrid } from './components/VideoGrid';
import { Toolbar } from './components/RoomToolbar';
import { ChatPanel } from './components/RoomChatPanel';
import { ReactionBar } from './components/ReactionBar';
import type { ParticipantRole } from './types';

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface WebRTCParticipant {
  id: string;
  user: string;
  user_name?: string;
  role?: ParticipantRole;
  is_mic_on?: boolean;
  is_camera_on?: boolean;
  is_screen_sharing?: boolean;
  hand_raised?: boolean;
  last_reaction?: string;
}

interface ChatMessage {
  id: string;
  sender_id?: string;
  sender_name?: string;
  content: string;
  kind: 'chat' | 'system';
}

interface NativeRoomViewProps {
  title: string;
  sessionId: string;
  wsHost: string;
  authToken: string;
  selfUserId?: string;
  selfRole?: string;
  onLeave: () => void;
}

function upsertParticipant(list: WebRTCParticipant[], p: WebRTCParticipant) {
  const idx = list.findIndex((item) => item.user === p.user);
  if (idx < 0) return [...list, p];
  const next = [...list];
  next[idx] = { ...next[idx], ...p };
  return next;
}

function shouldInitiate(selfUserId: string, remoteUserId: string) {
  return selfUserId.localeCompare(remoteUserId) < 0;
}

export function NativeRoomView({ title, sessionId, wsHost, authToken, selfUserId: initialSelfUserId, selfRole: initialSelfRole, onLeave }: NativeRoomViewProps) {
  const insets = useSafeAreaInsets();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUserRef = useRef(false);
  const selfUserIdRef = useRef('');
  const localStreamRef = useRef<any>(null);
  const screenStreamRef = useRef<any>(null);
  const peersRef = useRef<Map<string, any>>(new Map());
  const offeredPeersRef = useRef<Set<string>>(new Set());

  const [participants, setParticipants] = useState<WebRTCParticipant[]>([]);
  const [selfUserId, setSelfUserId] = useState(initialSelfUserId || '');
  const [selfRole, setSelfRole] = useState<ParticipantRole | undefined>(initialSelfRole as ParticipantRole | undefined);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'syncing'>('connecting');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactionBanner, setReactionBanner] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, string>>({});
  const [peerStatuses, setPeerStatuses] = useState<Record<string, string>>({});
  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const [rtcConfig, setRtcConfig] = useState<RTCConfiguration>(DEFAULT_RTC_CONFIG);
  const mediaReadyRef = useRef(false);

  const bannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { selfUserIdRef.current = selfUserId; }, [selfUserId]);

  const sendSocketPayload = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const syncState = useCallback(
    (state: Partial<Pick<WebRTCParticipant, 'is_mic_on' | 'is_camera_on' | 'is_screen_sharing' | 'hand_raised'>>) => {
      sendSocketPayload({ kind: 'participant_state', ...state });
    },
    [sendSocketPayload],
  );

  useEffect(() => { syncState({ is_mic_on: !isMuted }); }, [isMuted, syncState]);
  useEffect(() => { syncState({ is_camera_on: !isVideoOff }); }, [isVideoOff, syncState]);
  useEffect(() => { syncState({ is_screen_sharing: isScreenSharing }); }, [isScreenSharing, syncState]);
  useEffect(() => { syncState({ hand_raised: isHandRaised }); }, [isHandRaised, syncState]);

  // WebSocket
  useEffect(() => {
    if (!sessionId || !wsHost || !authToken) return;
    let reconnectAttempts = 0;

    const openSocket = () => {
      if (closedByUserRef.current) return;
      const protocol = wsHost.includes('localhost') || wsHost.includes('10.') ? 'ws' : 'wss';
      const url = `${protocol}://${wsHost}/ws/live/${sessionId}/?token=${authToken}`;
      const socket = new WebSocket(url);
      socketRef.current = socket;
      setConnectionStatus('connecting');

      socket.onopen = () => {
        reconnectAttempts = 0;
        setConnectionStatus('connected');
        syncState({ is_mic_on: !isMuted, is_camera_on: !isVideoOff, is_screen_sharing: isScreenSharing, hand_raised: isHandRaised });
        fetch(`${wsHost.includes('http') ? wsHost : 'http://' + wsHost}/api/v1/live-chat-messages/?session=${sessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
          .then((r) => r.json())
          .then((data) => {
            const msgs = (data.results ?? data ?? []).map((m: any) => ({ id: m.id, sender_id: m.user, sender_name: m.user_name, content: m.content, kind: 'chat' as const }));
            setChatMessages(msgs);
          })
          .catch(() => {});
      };

      socket.onmessage = async (event) => {
        try {
          const { payload, sender_id } = JSON.parse(event.data);
          if (!payload) return;

          if (payload.kind === 'participant_joined' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant));
            if (sender_id && selfUserIdRef.current && sender_id !== selfUserIdRef.current && mediaReadyRef.current && shouldInitiate(selfUserIdRef.current, sender_id)) {
              createOfferFor(sender_id).catch(() => undefined);
            }
            return;
          }

          if (payload.kind === 'participant_left' && payload.participant?.user) {
            cleanupPeer(payload.participant.user);
            setParticipants((prev) => prev.filter((item) => item.user !== payload.participant?.user));
            return;
          }

          if (payload.kind === 'participant_state' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant));
            return;
          }

          if (payload.kind === 'reaction' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant));
            const label = `${payload.participant.user_name || 'Participant'} ${payload.reaction || payload.participant.last_reaction || ''}`;
            setReactionBanner(label);
            Animated.sequence([
              Animated.timing(bannerAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.delay(2000),
              Animated.timing(bannerAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start(() => setReactionBanner(null));
            return;
          }

          if (payload.kind === 'chat_message' && payload.content) {
            setChatMessages((prev) => {
              const isDuplicate = prev.some(
                (m) => m.content === payload.content && m.sender_id === payload.user_id && Date.now() - parseInt(m.id.split('-')[0] || '0', 10) < 2000,
              );
              if (isDuplicate) return prev;
              return [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, sender_id: payload.user_id, sender_name: payload.user_name, content: payload.content, kind: 'chat' }];
            });
            return;
          }

          if (payload.kind === 'session_ended') {
            onLeave();
            return;
          }

          if (payload.kind === 'mute_all' && sender_id !== selfUserIdRef.current) {
            setIsMuted(true);
            return;
          }

          if (payload.kind === 'sent_to_waiting' && payload.participant) {
            if (payload.participant.user === selfUserIdRef.current) {
              onLeave();
              return;
            }
            setParticipants((prev) => prev.filter((p) => p.user !== payload.participant?.user));
            return;
          }

          if (payload.kind === 'cohost_added' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant));
            if (payload.participant.user === selfUserIdRef.current) {
              setSelfRole('CO_HOST');
            }
            return;
          }

          if (payload.kind === 'entry_granted' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant));
            return;
          }

          if (payload.kind === 'entry_denied' && payload.user_id) {
            if (payload.user_id === selfUserIdRef.current) {
              onLeave();
              return;
            }
            setParticipants((prev) => prev.filter((p) => p.user !== payload.user_id));
            return;
          }

          if (!selfUserIdRef.current || !sender_id || sender_id === selfUserIdRef.current) return;
          if (payload.target_user_id !== selfUserIdRef.current) return;

          if (payload.kind === 'webrtc_offer' && payload.description) {
            const peer = ensurePeer(sender_id);
            updatePeerTracks(peer);
            await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            sendSocketPayload({ kind: 'webrtc_answer', target_user_id: sender_id, description: peer.localDescription || answer });
            return;
          }

          if (payload.kind === 'webrtc_answer' && payload.description) {
            const peer = ensurePeer(sender_id);
            await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
            return;
          }

          if (payload.kind === 'webrtc_ice_candidate' && payload.candidate) {
            const peer = ensurePeer(sender_id);
            await peer.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => undefined);
          }
        } catch { /* ignore */ }
      };

      socket.onclose = () => {
        if (closedByUserRef.current) return;
        reconnectAttempts += 1;
        setConnectionStatus('syncing');
        reconnectTimerRef.current = setTimeout(openSocket, Math.min(1500 * reconnectAttempts, 6000));
      };
      socket.onerror = () => socket.close();
    };

    openSocket();
    return () => {
      closedByUserRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      peersRef.current.forEach((_, uid) => cleanupPeer(uid));
    };
  }, [sessionId, wsHost, authToken]);

  useEffect(() => { closedByUserRef.current = false; }, [sessionId]);

  // Media
  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user', width: 320, height: 240 } });
      localStreamRef.current = stream;
      mediaReadyRef.current = true;
      setLocalStreamURL(stream.toURL());
      return stream;
    } catch {
      setMediaError('Allow camera and mic to broadcast.');
      return null;
    }
  }, []);

  const getVideoTrack = () => {
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    if (screenTrack) return screenTrack;
    return localStreamRef.current?.getVideoTracks()[0] || null;
  };
  const getAudioTrack = () => localStreamRef.current?.getAudioTracks()[0] || null;

  const updatePeerTracks = (peer: any) => {
    const audioTrack = getAudioTrack();
    const videoTrack = getVideoTrack();
    const audioSender = peer.getSenders?.()?.find((s: any) => s.track?.kind === 'audio');
    const videoSender = peer.getSenders?.()?.find((s: any) => s.track?.kind === 'video');

    if (audioTrack) {
      if (audioSender) audioSender.replaceTrack(audioTrack).catch(() => undefined);
      else if (localStreamRef.current) peer.addTrack(audioTrack, localStreamRef.current);
    }
    if (videoTrack) {
      if (videoSender) videoSender.replaceTrack(videoTrack).catch(() => undefined);
      else peer.addTrack(videoTrack, localStreamRef.current);
    } else if (videoSender) {
      videoSender.replaceTrack(null).catch(() => undefined);
    }
  };

  const cleanupPeer = (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) { peer.close(); peersRef.current.delete(remoteUserId); }
    offeredPeersRef.current.delete(remoteUserId);
    setPeerStatuses((prev) => { const next = { ...prev }; delete next[remoteUserId]; return next; });
    setRemoteStreams((prev) => { const next = { ...prev }; delete next[remoteUserId]; return next; });
  };

  const ensurePeer = (remoteUserId: string) => {
    const existing = peersRef.current.get(remoteUserId);
    if (existing) return existing;

    const peer = new RTCPeerConnection(rtcConfig);
    setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connecting' }));
    updatePeerTracks(peer);

    (peer as any).addEventListener?.('track', (event: any) => {
      const stream = event.streams?.[0];
      if (stream) setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: stream.toURL() }));
    });

    (peer as any).addEventListener?.('icecandidate', (event: any) => {
      if (!event.candidate) return;
      sendSocketPayload({ kind: 'webrtc_ice_candidate', target_user_id: remoteUserId, candidate: event.candidate.toJSON() });
    });

    (peer as any).addEventListener?.('connectionstatechange', () => {
      const state = peer.connectionState;
      if (state === 'connected') setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connected' }));
      else if (['connecting', 'new'].includes(state)) setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connecting' }));
      else if (state === 'failed') { setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'failed' })); cleanupPeer(remoteUserId); }
      else if (['closed', 'disconnected'].includes(state)) { setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'idle' })); cleanupPeer(remoteUserId); }
    });

    peersRef.current.set(remoteUserId, peer);
    return peer;
  };

  const renegotiatePeer = async (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (!peer || !selfUserIdRef.current || peer.signalingState !== 'stable') return;
    updatePeerTracks(peer);
    if (!shouldInitiate(selfUserIdRef.current, remoteUserId)) return;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSocketPayload({ kind: 'webrtc_offer', target_user_id: remoteUserId, description: peer.localDescription || offer });
  };

  const createOfferFor = async (remoteUserId: string) => {
    if (!selfUserId || offeredPeersRef.current.has(remoteUserId)) return;
    const peer = ensurePeer(remoteUserId);
    offeredPeersRef.current.add(remoteUserId);
    updatePeerTracks(peer);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSocketPayload({ kind: 'webrtc_offer', target_user_id: remoteUserId, description: peer.localDescription || offer });
  };

  useEffect(() => {
    if (!selfUserId || socketRef.current?.readyState !== WebSocket.OPEN || !mediaReadyRef.current) return;
    participants.filter((p) => p.user !== selfUserId).forEach((p) => {
      ensurePeer(p.user);
      if (shouldInitiate(selfUserId, p.user)) createOfferFor(p.user).catch(() => undefined);
    });
  }, [participants, selfUserId, localStreamURL]);

  useEffect(() => {
    initLocalMedia();
    fetch(`${wsHost.includes('http') ? wsHost : 'http://' + wsHost}/api/v1/live-sessions/ice-config/`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.iceServers?.length) setRtcConfig({ iceServers: data.iceServers }); })
      .catch(() => {});
    return () => {
      localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
      setLocalStreamURL(null);
    };
  }, []);

  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t: any) => { t.enabled = !isMuted; });
    peersRef.current.forEach((_, uid) => { renegotiatePeer(uid).catch(() => undefined); });
  }, [isMuted]);

  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((t: any) => { t.enabled = !isVideoOff; });
    peersRef.current.forEach((_, uid) => { renegotiatePeer(uid).catch(() => undefined); });
  }, [isVideoOff]);

  // Poll participants
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${wsHost.includes('http') ? wsHost : 'http://' + wsHost}/api/v1/live-participants/?session=${sessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          const fresh = data.results ?? data ?? [];
          const freshUserIds = new Set(fresh.map((p: any) => p.user));
          setParticipants((prev) => {
            let next = [...prev];
            for (const p of fresh) next = upsertParticipant(next, { id: p.id, user: p.user, user_name: p.user_name, role: p.role, is_mic_on: p.is_mic_on, is_camera_on: p.is_camera_on, is_screen_sharing: p.is_screen_sharing, hand_raised: p.hand_raised, last_reaction: p.last_reaction });
            next = next.filter((p) => freshUserIds.has(p.user));
            return next;
          });
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleChatSend = (content: string) => {
    sendSocketPayload({ kind: 'chat_message', content });
  };

  const handleReaction = (reaction: string) => {
    sendSocketPayload({ kind: 'reaction', reaction });
    setShowReactions(false);
  };

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t: any) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      peersRef.current.forEach((peer) => updatePeerTracks(peer));
      return;
    }
    try {
      const { mediaDevices } = await import('react-native-webrtc');
      const stream = await (mediaDevices as any).getDisplayMedia();
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      peersRef.current.forEach((peer) => updatePeerTracks(peer));
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          screenStreamRef.current = null;
          setIsScreenSharing(false);
          peersRef.current.forEach((peer) => updatePeerTracks(peer));
        };
      }
    } catch {
      // User cancelled or getDisplayMedia not supported on this device
    }
  }, [isScreenSharing]);

  const visibleParticipants = useMemo(() => {
    let list = [...participants];
    const self = list.find((p) => p.user === selfUserId);
    const others = list.filter((p) => p.user !== selfUserId);
    if (self) return [{ ...self, is_mic_on: !isMuted, is_camera_on: !isVideoOff, is_screen_sharing: isScreenSharing, hand_raised: isHandRaised }, ...others];
    return others;
  }, [participants, selfUserId, isMuted, isVideoOff, isScreenSharing, isHandRaised]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarLeft}>
          <ThemedText bold style={styles.topTitle} numberOfLines={1}>{title}</ThemedText>
          <ThemedText style={styles.topSubtitle}>{visibleParticipants.length} participant(s)</ThemedText>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>LIVE</ThemedText>
        </View>
      </View>

      {/* Reaction banner */}
      {reactionBanner && (
        <Animated.View style={[styles.banner, { opacity: bannerAnim, top: insets.top + 60 }]}>
          <ThemedText style={styles.bannerText}>{reactionBanner}</ThemedText>
        </Animated.View>
      )}

      {/* Video grid */}
      <VideoGrid
        participants={visibleParticipants}
        remoteStreams={remoteStreams}
        selfUserId={selfUserId}
        localStreamURL={localStreamURL}
        isVideoOff={isVideoOff}
        isMuted={isMuted}
        isHandRaised={isHandRaised}
        peerStatuses={peerStatuses}
      />

      {/* Chat panel */}
      <ChatPanel messages={chatMessages} visible={showChat} selfUserId={selfUserId} onClose={() => setShowChat(false)} onSend={handleChatSend} />

      {/* Reactions */}
      <ReactionBar visible={showReactions} onSelect={handleReaction} onClose={() => setShowReactions(false)} />

      {/* Toolbar */}
      <Toolbar
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        showChat={showChat}
        isHost={selfRole === 'HOST' || selfRole === 'CO_HOST'}
        onToggleMute={() => setIsMuted((v) => !v)}
        onToggleVideo={() => setIsVideoOff((v) => !v)}
        onToggleScreenShare={toggleScreenShare}
        onToggleHand={() => setIsHandRaised((v) => !v)}
        onToggleReactions={() => setShowReactions((v) => !v)}
        onToggleChat={() => setShowChat((v) => !v)}
        onLeave={onLeave}
        onEndSession={selfRole === 'HOST' || selfRole === 'CO_HOST' ? () => {
          fetch(`${wsHost.includes('http') ? wsHost : 'http://' + wsHost}/api/v1/live-sessions/${sessionId}/end/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          }).catch(() => {});
          onLeave();
        } : undefined}
        onMuteAll={selfRole === 'HOST' || selfRole === 'CO_HOST' ? () => sendSocketPayload({ kind: 'mute_all' }) : undefined}
      />
    </KeyboardAvoidingView>
  );
}

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  topBarLeft: { flex: 1 },
  topTitle: { color: '#fff', fontSize: 15 },
  topSubtitle: { color: '#64748b', fontSize: 11 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { color: '#fca5a5', fontSize: 11, fontWeight: '700' },
  banner: {
    position: 'absolute', left: 0, right: 0, zIndex: 10, alignItems: 'center',
  },
  bannerText: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)', color: '#fde68a', fontWeight: '600', fontSize: 13,
  },
});
