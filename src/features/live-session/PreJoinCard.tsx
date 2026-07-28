import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Spacing } from '../../theme/colors';
import type { LiveSession } from '../../services/schedule';
import { STATUS_CONFIG, type SessionStatus } from './constants';
import { liveSessionStyles as styles } from './styles';

type ThemeColors = {
  primary: string;
  primaryLight: string;
  error: string;
  warning: string;
  success: string;
  textMuted: string;
};

interface PreJoinCardProps {
  session: LiveSession;
  colors: ThemeColors;
  joining: boolean;
  joined: boolean;
  isHost: boolean;
  admitted: boolean;
  waitingEntry: boolean;
  onJoin: () => void;
  onEnterRoom: () => void;
  onGoLive?: () => void;
  onRequestEntry?: () => void;
}

export function PreJoinCard({ session, colors, joining, joined, isHost, admitted, waitingEntry, onJoin, onEnterRoom, onGoLive, onRequestEntry }: PreJoinCardProps) {
  const status = (session.status as SessionStatus) || 'SCHEDULED';
  const cfg = STATUS_CONFIG[status];
  const statusColor = colors[cfg.colorKey];

  const isLive = status === 'LIVE';
  const isWaiting = status === 'WAITING';
  const isScheduled = status === 'SCHEDULED';
  const isEnded = status === 'ENDED';

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center' }}>
        <View style={[styles.liveIcon, { backgroundColor: isLive ? colors.error + '20' : colors.primaryLight }]}>
          <Ionicons
            name={isLive ? 'radio' : isWaiting ? 'hourglass' : isEnded ? 'checkmark-circle-outline' : 'calendar-outline'}
            size={44}
            color={isLive ? colors.error : isWaiting ? colors.warning : colors.primary}
          />
        </View>
        <ThemedText variant="h2" bold style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
          {session.title}
        </ThemedText>
        {session.course_title ? (
          <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
            {session.course_title}
          </ThemedText>
        ) : null}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', marginTop: Spacing.md }]}>
          <Ionicons name={cfg.icon} size={14} color={statusColor} />
          <ThemedText variant="label" style={{ color: statusColor, marginLeft: 4 }}>
            {cfg.label}
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginTop: Spacing.xl }}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} />
          <ThemedText variant="body" style={{ marginLeft: Spacing.md }}>
            {session.instructor_name || 'Instructor'}
          </ThemedText>
        </View>
        <View style={[styles.infoRow, { marginTop: Spacing.md }]}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <ThemedText variant="body" style={{ marginLeft: Spacing.md }}>
            {new Date(session.scheduled_at).toLocaleString()} · {session.duration_minutes}min
          </ThemedText>
        </View>
      </ThemedView>

      <View style={{ marginTop: Spacing['2xl'] }}>
        {/* Host: WAITING → Go Live */}
        {isWaiting && isHost && (
          <TouchableOpacity onPress={onGoLive} style={[styles.joinBtn, { backgroundColor: colors.error }]}>
            <Ionicons name="radio" size={22} color="#fff" />
            <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>
              Go Live
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Host: LIVE → Enter Room */}
        {isLive && isHost && (
          <TouchableOpacity onPress={joined ? onEnterRoom : onJoin} disabled={joining} style={[styles.joinBtn, { backgroundColor: colors.error }]}>
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="videocam-outline" size={22} color="#fff" />
                <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>
                  {joined ? 'Enter Video Room' : 'Join Session'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Student: LIVE + admitted → Join / Enter */}
        {isLive && !isHost && admitted && (
          <>
            {!joined ? (
              <TouchableOpacity onPress={onJoin} disabled={joining} style={[styles.joinBtn, { backgroundColor: colors.error }]}>
                {joining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="enter-outline" size={22} color="#fff" />
                    <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>
                      Join Session
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onEnterRoom} style={[styles.joinBtn, { backgroundColor: colors.error }]}>
                <Ionicons name="videocam-outline" size={22} color="#fff" />
                <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>
                  Enter Video Room
                </ThemedText>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Student: LIVE + not admitted + not waiting → Request entry */}
        {isLive && !isHost && !admitted && !waitingEntry && (
          <TouchableOpacity onPress={onRequestEntry} style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="key-outline" size={22} color="#fff" />
            <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>
              Request to Join
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Student: Waiting for admission */}
        {waitingEntry && (
          <ThemedView variant="secondary" rounded="xl" style={styles.noticeCard}>
            <Ionicons name="hourglass-outline" size={18} color={colors.warning} />
            <ThemedText variant="caption" style={{ color: colors.warning, marginLeft: Spacing.sm, flex: 1 }}>
              Waiting for host to admit you...
            </ThemedText>
          </ThemedView>
        )}

        {/* Scheduled */}
        {isScheduled && (
          <ThemedView variant="secondary" rounded="xl" style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <ThemedText variant="caption" color="muted" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              This session hasn't started yet.
            </ThemedText>
          </ThemedView>
        )}

        {/* Ended */}
        {isEnded && (
          <ThemedView variant="secondary" rounded="xl" style={styles.noticeCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <ThemedText variant="caption" style={{ color: colors.success, marginLeft: Spacing.sm, flex: 1 }}>
              This session has ended.
            </ThemedText>
          </ThemedView>
        )}
      </View>
    </View>
  );
}
