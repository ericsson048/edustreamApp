import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ThemedText } from '../../components/ThemedText';
import { Spacing } from '../../theme/colors';
import { buildRoomHtml } from './roomHtml';
import type { RoomViewMessage } from './types';

interface VideoRoomViewProps {
  title: string;
  sessionId: string;
  wsHost: string;
  authToken: string;
  onLeave: () => void;
}

export function VideoRoomView({ title, sessionId, wsHost, authToken, onLeave }: VideoRoomViewProps) {
  const insets = useSafeAreaInsets();

  const roomHtml = useMemo(
    () => buildRoomHtml({ wsHost, authToken, sessionId }),
    [wsHost, authToken, sessionId]
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    let msg: RoomViewMessage | null = null;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg?.type === 'leave') onLeave();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f23' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingBottom: Spacing.sm,
        }}
      >
        <TouchableOpacity onPress={onLeave} style={{ padding: 4 }} accessibilityLabel="Minimize call">
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.md, fontSize: 15 }} numberOfLines={1}>
          {title}
        </ThemedText>
      </View>

      <WebView
        source={{ html: roomHtml }}
        style={{ flex: 1, backgroundColor: '#0b1120' }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowFileAccess
        allowUniversalAccessFromFileURLs
        originWhitelist={['*']}
        androidLayerType="hardware"
        mixedContentMode="compatibility"
        allowsAirPlayForMediaPlayback
        mediaCapturePermissionGrantType="grant"
      />
    </View>
  );
}
