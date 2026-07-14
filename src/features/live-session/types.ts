export type ParticipantRole = 'HOST' | 'PARTICIPANT';

export interface RoomParticipant {
  user: string;
  user_name?: string;
  role?: ParticipantRole;
  is_mic_on?: boolean;
  is_camera_on?: boolean;
  hand_raised?: boolean;
  last_reaction?: string;
}

export type WsMessageKind =
  | 'participant_joined'
  | 'participant_left'
  | 'participant_state'
  | 'reaction'
  | 'chat_message'
  | 'webrtc_offer'
  | 'webrtc_answer'
  | 'webrtc_ice_candidate';

export interface WsPayload {
  kind: WsMessageKind;
  participant?: RoomParticipant;
  content?: string;
  user_name?: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  target_user_id?: string;
  reaction?: string;
}

export interface WsEnvelope {
  sender_id?: string;
  payload: WsPayload;
}

export type RoomViewMessage = { type: 'leave' } | { type: 'error'; message: string };

export interface BuildRoomHtmlOptions {
  wsHost: string;
  authToken: string;
  sessionId: string;
}
