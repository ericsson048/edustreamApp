import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mediaDevices, RTCView, RTCPeerConnection, MediaStream, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { ThemedText } from '../../components/ThemedText';
import { Spacing } from '../../theme/colors';
import type { ParticipantRole } from './types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const QUICK_REACTIONS = ['👍', '👏', '🔥', '🎉', '❤️', '😂'];

interface WebRTCParticipant {
  id: string;
  user: string;
  user_name?: string;
  role?: ParticipantRole;
  is_mic_on?: boolean;
  is_camera_on?: boolean;
  hand_raised?: boolean;
  last_reaction?: string;
}

interface ChatMessage {
  id: string;
  sender_name?: string;
  content: string;
  kind: 'chat' | 'system';
}

interface NativeRoomViewProps {
  title: string;
  sessionId: string;
  wsHost: string;
  authToken: string;
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

export function NativeRoomView({ title, sessionId, wsHost, authToken, onLeave }: NativeRoomViewProps) {
  const insets = useSafeAreaInsets();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUserRef = useRef(false);
  const selfUserIdRef = useRef('');
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const offeredPeersRef = useRef<Set<string>>(new Set());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement | null>>(new Map());

  const [participants, setParticipants] = useState<WebRTCParticipant[]>([]);
  const [selfUserId, setSelfUserId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'syncing'>('connecting');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactionBanner, setReactionBanner] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, string>>({});
  const [peerStatuses, setPeerStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    selfUserIdRef.current = selfUserId;
  }, [selfUserId]);

  const sendSocketPayload = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const syncState = useCallback(
    (state: Partial<Pick<WebRTCParticipant, 'is_mic_on' | 'is_camera_on' | 'hand_raised'>>) => {
      sendSocketPayload({ kind: 'participant_state', ...state });
    },
    [sendSocketPayload],
  );

  useEffect(() => {
    syncState({ is_mic_on: !isMuted });
  }, [isMuted, syncState]);

  useEffect(() => {
    syncState({ is_camera_on: !isVideoOff });
  }, [isVideoOff, syncState]);

  useEffect(() => {
    syncState({ hand_raised: isHandRaised });
  }, [isHandRaised, syncState]);

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
        syncState({
          is_mic_on: !isMuted,
          is_camera_on: !isVideoOff,
          hand_raised: isHandRaised,
        });
      };

      socket.onmessage = async (event) => {
        try {
          const { payload, sender_id } = JSON.parse(event.data);
          if (!payload) return;

          if (payload.kind === 'participant_joined' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant));
            if (sender_id && selfUserIdRef.current && sender_id !== selfUserIdRef.current && shouldInitiate(selfUserIdRef.current, sender_id)) {
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
            setTimeout(() => setReactionBanner((current) => (current === label ? null : current)), 2000);
            return;
          }

          if (payload.kind === 'chat_message' && payload.content) {
            setChatMessages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, sender_name: payload.user_name, content: payload.content, kind: 'chat' }]);
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
            sendSocketPayload({
              kind: 'webrtc_answer',
              target_user_id: sender_id,
              description: peer.localDescription || answer,
            });
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
        } catch {
          // ignore malformed messages
        }
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
      peersRef.current.forEach((_, remoteUserId) => cleanupPeer(remoteUserId));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, wsHost, authToken]);

  useEffect(() => {
    closedByUserRef.current = false;
  }, [sessionId]);

  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user', width: 320, height: 240 } });
      localStreamRef.current = stream;
      return stream;
    } catch {
      setMediaError("Autorise la camera et le micro pour diffuser ton apercu local.");
      return null;
    }
  }, []);

  const getVideoTrack = () => localStreamRef.current?.getVideoTracks()[0] || null;
  const getAudioTrack = () => localStreamRef.current?.getAudioTracks()[0] || null;

  const updatePeerTracks = (peer: RTCPeerConnection) => {
    const audioTrack = getAudioTrack();
    const videoTrack = getVideoTrack();
    const audioSender = peer.getSenders().find((s) => s.track?.kind === 'audio');
    const videoSender = peer.getSenders().find((s) => s.track?.kind === 'video');

    if (audioTrack) {
      if (audioSender) {
        audioSender.replaceTrack(audioTrack).catch(() => undefined);
      } else {
        peer.addTrack(audioTrack, localStreamRef.current!);
      }
    }
    if (videoTrack) {
      if (videoSender) {
        videoSender.replaceTrack(videoTrack).catch(() => undefined);
      } else {
        peer.addTrack(videoTrack, localStreamRef.current!);
      }
    } else if (videoSender) {
      videoSender.replaceTrack(null).catch(() => undefined);
    }
  };

  const cleanupPeer = (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.close();
      peersRef.current.delete(remoteUserId);
    }
    offeredPeersRef.current.delete(remoteUserId);
    setPeerStatuses((prev) => {
      if (prev[remoteUserId] === 'failed') return prev;
      const next = { ...prev };
      delete next[remoteUserId];
      return next;
    });
    setRemoteStreams((prev) => {
      if (!(remoteUserId in prev)) return prev;
      const next = { ...prev };
      delete next[remoteUserId];
      return next;
    });
  };

  const ensurePeer = (remoteUserId: string) => {
    const existing = peersRef.current.get(remoteUserId);
    if (existing) return existing;

    const peer = new RTCPeerConnection(RTC_CONFIG);
    setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connecting' }));
    updatePeerTracks(peer);

    (peer as any).addEventListener('track', (event: any) => {
      const stream = event.streams?.[0];
      if (stream) {
        setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: stream.toURL() }));
      }
    });

    (peer as any).addEventListener('icecandidate', (event: any) => {
      if (!event.candidate) return;
      sendSocketPayload({
        kind: 'webrtc_ice_candidate',
        target_user_id: remoteUserId,
        candidate: event.candidate.toJSON(),
      });
    });

    (peer as any).addEventListener('connectionstatechange', () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connected' }));
      } else if (['connecting', 'new'].includes(state)) {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connecting' }));
      } else if (state === 'failed') {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'failed' }));
        cleanupPeer(remoteUserId);
      } else if (['closed', 'disconnected'].includes(state)) {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'idle' }));
        cleanupPeer(remoteUserId);
      }
    });

    peersRef.current.set(remoteUserId, peer);
    return peer;
  };

  const renegotiatePeer = async (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (!peer || !selfUserIdRef.current) return;
    if (peer.signalingState !== 'stable') return;
    updatePeerTracks(peer);
    if (!shouldInitiate(selfUserIdRef.current, remoteUserId)) return;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSocketPayload({
      kind: 'webrtc_offer',
      target_user_id: remoteUserId,
      description: peer.localDescription || offer,
    });
  };

  const createOfferFor = async (remoteUserId: string) => {
    if (!selfUserId || offeredPeersRef.current.has(remoteUserId)) return;
    const peer = ensurePeer(remoteUserId);
    offeredPeersRef.current.add(remoteUserId);
    updatePeerTracks(peer);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSocketPayload({
      kind: 'webrtc_offer',
      target_user_id: remoteUserId,
      description: peer.localDescription || offer,
    });
  };

  useEffect(() => {
    if (!selfUserId || socketRef.current?.readyState !== WebSocket.OPEN) return;
    visibleParticipants
      .filter((p) => p.user !== selfUserId)
      .forEach((p) => {
        ensurePeer(p.user);
        if (shouldInitiate(selfUserId, p.user)) {
          createOfferFor(p.user).catch(() => undefined);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, selfUserId]);

  useEffect(() => {
    initLocalMedia().then((stream) => {
      if (stream && stream.toURL()) {
        // use the stream, render via RTCView
      }
    });
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !isMuted; });
    peersRef.current.forEach((_, remoteUserId) => {
      renegotiatePeer(remoteUserId).catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted]);

  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !isVideoOff; });
    peersRef.current.forEach((_, remoteUserId) => {
      renegotiatePeer(remoteUserId).catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoOff]);

  // Re-create offers for new participants periodically
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
          setParticipants((prev) => {
            let next = [...prev];
            for (const p of fresh) {
              next = upsertParticipant(next, { id: p.id, user: p.user, user_name: p.user_name, role: p.role, is_mic_on: p.is_mic_on, is_camera_on: p.is_camera_on, hand_raised: p.hand_raised, last_reaction: p.last_reaction });
            }
            return next;
          });
        }
      } catch {
        // ignore poll errors
      }
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    sendSocketPayload({ kind: 'chat_message', content: chatInput.trim() });
    setChatInput('');
  };

  const handleReaction = (reaction: string) => {
    sendSocketPayload({ kind: 'reaction', reaction });
    setShowReactions(false);
  };

  const visibleParticipants = useMemo(() => {
    let list = [...participants];
    const self = list.find((p) => p.user === selfUserId);
    const others = list.filter((p) => p.user !== selfUserId);
    if (self) {
      return [{ ...self, is_mic_on: !isMuted, is_camera_on: !isVideoOff, hand_raised: isHandRaised }, ...others];
    }
    return others;
  }, [participants, selfUserId, isMuted, isVideoOff, isHandRaised]);

  const localStreamURL = localStreamRef.current?.toURL();
  const screenWidth = Dimensions.get('window').width;
  const tileSize = (screenWidth - Spacing.md * 4) / 2;

  const renderParticipantTile = (p: WebRTCParticipant, index: number) => {
    const isSelf = p.user === selfUserId;
    const streamURL = isSelf ? localStreamURL : remoteStreams[p.user];
    const initials = (p.user_name || 'P').slice(0, 2).toUpperCase();
    const hasStream = !!streamURL;
    const pStatus = isSelf ? 'connected' : (peerStatuses[p.user] || 'idle');

    return (
      <View key={p.user + index} style={{ width: tileSize, marginBottom: Spacing.md }}>
        <View style={{
          height: tileSize * 0.75,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          borderWidth: 1,
          borderColor: '#1e293b',
        }}>
          {hasStream && (!isVideoOff || !isSelf) ? (
            <RTCView
              streamURL={streamURL}
              objectFit="cover"
              mirror={isSelf}
              style={{ flex: 1 }}
              zOrder={0}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{initials}</ThemedText>
              </View>
            </View>
          )}
          {isHandRaised && isSelf ? (
            <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 }}>
              <ThemedText style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700' }}>✋</ThemedText>
            </View>
          ) : null}
          <View style={{ position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', gap: 4 }}>
            <View style={{ backgroundColor: p.is_mic_on ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 }}>
              <ThemedText style={{ color: p.is_mic_on ? '#6ee7b7' : '#fca5a5', fontSize: 9, fontWeight: '700' }}>
                {p.is_mic_on ? 'Mic' : 'Muted'}
              </ThemedText>
            </View>
            <View style={{ backgroundColor: p.is_camera_on ? 'rgba(56,189,248,0.2)' : 'rgba(100,116,139,0.2)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 }}>
              <ThemedText style={{ color: p.is_camera_on ? '#7dd3fc' : '#94a3b8', fontSize: 9, fontWeight: '700' }}>
                {p.is_camera_on ? 'Cam' : 'Off'}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ThemedText style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
            {p.user_name || 'Participant'}
          </ThemedText>
          {!isSelf && pStatus !== 'connected' ? (
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pStatus === 'connecting' ? '#f59e0b' : pStatus === 'failed' ? '#ef4444' : '#64748b' }} />
          ) : null}
        </View>
        {p.last_reaction ? (
          <ThemedText style={{ color: '#94a3b8', fontSize: 11 }}>{p.last_reaction}</ThemedText>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + 8,
        paddingHorizontal: Spacing.md,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
      }}>
        <TouchableOpacity onPress={onLeave} style={{ padding: 4 }} accessibilityLabel="Leave room">
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <ThemedText bold style={{ color: '#fff', fontSize: 15 }} numberOfLines={1}>{title}</ThemedText>
          <ThemedText style={{ color: '#64748b', fontSize: 11 }}>{visibleParticipants.length} participant(s)</ThemedText>
        </View>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(239,68,68,0.15)',
          borderRadius: 16,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
          <ThemedText style={{ color: '#fca5a5', fontSize: 11, fontWeight: '700' }}>LIVE</ThemedText>
        </View>
      </View>

      {/* Reaction banner */}
      {reactionBanner ? (
        <View style={{ position: 'absolute', top: (insets.top + 50), left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' }}>
            <ThemedText style={{ color: '#fde68a', fontWeight: '600', fontSize: 13 }}>{reactionBanner}</ThemedText>
          </View>
        </View>
      ) : null}

      {/* Chat overlay */}
      {showChat && (
        <View style={{ position: 'absolute', bottom: 80, left: 0, right: 0, top: 60, zIndex: 20, backgroundColor: 'rgba(15,23,42,0.95)', borderTopWidth: 1, borderTopColor: '#1e293b' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
            <ThemedText bold style={{ color: '#fff', fontSize: 14 }}>Chat</ThemedText>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: Spacing.md }}>
            {chatMessages.length === 0 ? (
              <ThemedText style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>Aucun message pour le moment.</ThemedText>
            ) : null}
            {chatMessages.map((msg) => (
              <View key={msg.id} style={{
                marginBottom: 8,
                padding: 10,
                borderRadius: 12,
                backgroundColor: msg.kind === 'system' ? 'rgba(245,158,11,0.1)' : '#1e293b',
              }}>
                <ThemedText style={{ color: msg.kind === 'system' ? '#fbbf24' : '#64748b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                  {msg.kind === 'system' ? 'SYSTEME' : msg.sender_name || 'Participant'}
                </ThemedText>
                <ThemedText style={{ color: '#e2e8f0', fontSize: 13, marginTop: 2 }}>{msg.content}</ThemedText>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, padding: Spacing.md, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ecrire un message..."
              placeholderTextColor="#64748b"
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: '#fff',
                fontSize: 13,
                borderWidth: 1,
                borderColor: '#334155',
              }}
              onSubmitEditing={handleChatSend}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleChatSend} style={{ backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}>
              <ThemedText bold style={{ color: '#fff', fontSize: 13 }}>Send</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reaction picker */}
      {showReactions && (
        <View style={{ position: 'absolute', bottom: 80, left: 0, right: 0, zIndex: 20, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#1e293b', borderRadius: 20, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
            {QUICK_REACTIONS.map((r) => (
              <TouchableOpacity key={r} onPress={() => handleReaction(r)} style={{ padding: 4 }}>
                <ThemedText style={{ fontSize: 22 }}>{r}</ThemedText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowReactions(false)} style={{ padding: 4, justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Participant grid */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md }}>
        {/* Local preview tile (shown larger) */}
        {localStreamURL || mediaError ? (
          <View style={{
            height: 200,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: '#0b1120',
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: Spacing.md,
          }}>
            {localStreamURL && !isVideoOff ? (
              <RTCView
                streamURL={localStreamURL}
                objectFit="cover"
                mirror
                style={{ flex: 1 }}
                zOrder={0}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="videocam-off" size={32} color="#64748b" />
                <ThemedText style={{ color: '#94a3b8', marginTop: 8, fontSize: 12 }}>{mediaError || 'Camera off'}</ThemedText>
              </View>
            )}
            <View style={{
              position: 'absolute',
              top: 8,
              left: 12,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
              <ThemedText style={{ color: '#e2e8f0', fontSize: 11, fontWeight: '600' }}>
                Ton flux local
              </ThemedText>
              <ThemedText style={{ color: '#94a3b8', fontSize: 9 }}>
                {connectionStatus === 'connected' ? 'Connecte' : connectionStatus === 'connecting' ? 'Connexion...' : 'Sync...'}
              </ThemedText>
            </View>
            <View style={{ position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 4 }}>
              {isHandRaised ? <View style={{ backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}><ThemedText style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700' }}>✋</ThemedText></View> : null}
            </View>
          </View>
        ) : null}

        {/* Participant grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {visibleParticipants.filter((p) => p.user !== selfUserId).map((p, i) => renderParticipantTile(p, i))}
        </View>

        {visibleParticipants.length <= 1 && (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <ThemedText style={{ color: '#64748b', fontSize: 13 }}>
              En attente d'autres participants...
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Media controls toolbar */}
      <View style={{
        paddingBottom: insets.bottom + 8,
        paddingTop: 8,
        paddingHorizontal: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        backgroundColor: '#0f172a',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          <ToolbarButton
            icon={isMuted ? 'mic-off' : 'mic'}
            color={isMuted ? '#ef4444' : '#e2e8f0'}
            bgColor={isMuted ? 'rgba(239,68,68,0.2)' : '#1e293b'}
            onPress={() => setIsMuted((v) => !v)}
          />
          <ToolbarButton
            icon={isVideoOff ? 'videocam-off' : 'videocam'}
            color={isVideoOff ? '#ef4444' : '#e2e8f0'}
            bgColor={isVideoOff ? 'rgba(239,68,68,0.2)' : '#1e293b'}
            onPress={() => setIsVideoOff((v) => !v)}
          />
          <ToolbarButton
            icon={isHandRaised ? 'hand-left' : 'hand-left-outline'}
            color={isHandRaised ? '#f59e0b' : '#e2e8f0'}
            bgColor={isHandRaised ? 'rgba(245,158,11,0.2)' : '#1e293b'}
            onPress={() => setIsHandRaised((v) => !v)}
          />
          <ToolbarButton
            icon="happy-outline"
            color="#e2e8f0"
            bgColor="#1e293b"
            onPress={() => setShowReactions((v) => !v)}
          />
          <ToolbarButton
            icon={showChat ? 'chatbubbles' : 'chatbubbles-outline'}
            color={showChat ? '#3b82f6' : '#e2e8f0'}
            bgColor={showChat ? 'rgba(59,130,246,0.2)' : '#1e293b'}
            onPress={() => setShowChat((v) => !v)}
          />
          <TouchableOpacity
            onPress={onLeave}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: '#dc2626',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            accessibilityLabel="Leave call"
          >
            <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ToolbarButton({
  icon,
  color,
  bgColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons name={icon} size={22} color={color} />
    </TouchableOpacity>
  );
}
