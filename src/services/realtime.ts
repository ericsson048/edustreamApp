import { getApiBaseUrl } from './apiClient';
import * as SecureStore from 'expo-secure-store';

function getApiOrigin() {
  return new URL(getApiBaseUrl()).origin;
}

export async function buildWebSocketConnection(path: string) {
  const origin = getApiOrigin();
  const wsProtocol = origin.startsWith('https://') ? 'wss://' : 'ws://';
  const token = await SecureStore.getItemAsync('edustream_access_token');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${wsProtocol}${origin.replace(/^https?:\/\//, '')}${normalizedPath}`);
  return {
    url: url.toString(),
    protocols: token ? [`edustream.jwt.${token}`] : [],
  };
}
