import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL_STORAGE_KEY = 'edustream_api_base_url';
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const developmentApiUrl = `http://${expoHost || 'localhost'}:8000/api/v1`;

function normalizeApiBaseUrl(value: string) {
  let url: URL;
  try {
    const input = value.trim();
    const urlWithProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `http://${input}`;
    url = new URL(urlWithProtocol);
  } catch {
    throw new Error('Saisissez une adresse complète, par exemple http://192.168.1.20:8100/api/v1.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash) {
    throw new Error('L’adresse doit utiliser HTTP ou HTTPS et ne contenir ni identifiant, ni paramètre.');
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (path && path !== '/api/v1') {
    throw new Error('L’adresse doit se terminer par /api/v1 ou ne contenir aucun chemin.');
  }

  return `${url.origin}/api/v1`;
}

let apiBaseUrl = normalizeApiBaseUrl(configuredApiUrl || developmentApiUrl);
let initialization: Promise<void> | undefined;

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function initializeApiBaseUrl() {
  if (!initialization) {
    initialization = AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY).then((storedUrl) => {
      if (storedUrl) apiBaseUrl = normalizeApiBaseUrl(storedUrl);
      apiClient.defaults.baseURL = apiBaseUrl;
    });
  }
  return initialization;
}

export async function setApiBaseUrl(value: string) {
  const normalizedUrl = normalizeApiBaseUrl(value);
  await initializeApiBaseUrl();
  await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, normalizedUrl);
  apiBaseUrl = normalizedUrl;
  apiClient.defaults.baseURL = normalizedUrl;
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 secondes max - évite le blocage infini si le backend est injoignable
});

apiClient.interceptors.request.use(async (config) => {
  await initializeApiBaseUrl();
  config.baseURL = apiBaseUrl;
  const token = await SecureStore.getItemAsync('edustream_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('edustream_refresh_token');
        if (!refresh) throw new Error('No refresh token');
        await initializeApiBaseUrl();
        const { data } = await axios.post(`${apiBaseUrl}/auth/refresh/`, { refresh });
        await SecureStore.setItemAsync('edustream_access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original);
      } catch {
        await SecureStore.deleteItemAsync('edustream_access_token');
        await SecureStore.deleteItemAsync('edustream_refresh_token');
      }
    }
    return Promise.reject(error);
  }
);
