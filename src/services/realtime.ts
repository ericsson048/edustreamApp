import { BASE_URL } from './apiClient';
import * as SecureStore from 'expo-secure-store';

function getApiOrigin() {
  return new URL(BASE_URL).origin;
}

export async function buildWebSocketUrl(path: string) {
  const origin = getApiOrigin();
  const wsProtocol = origin.startsWith('https://') ? 'wss://' : 'ws://';
  const token = await SecureStore.getItemAsync('edustream_access_token');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${wsProtocol}${origin.replace(/^https?:\/\//, '')}${normalizedPath}`);
  if (token) url.searchParams.set('token', token);
  return url.toString();
}
