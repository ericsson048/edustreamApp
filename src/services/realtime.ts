import * as SecureStore from 'expo-secure-store';

function getApiOrigin() {
  const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.204.215.26:8000/api/v1';
  return new URL(baseURL).origin;
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
