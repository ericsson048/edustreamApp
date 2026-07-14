import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService, type AuthUser } from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; full_name: string; role: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const token = await SecureStore.getItemAsync('edustream_access_token');
      if (token) {
        const me = await authService.getMe();
        setUser(me);
      }
    } catch {
      await SecureStore.deleteItemAsync('edustream_access_token');
      await SecureStore.deleteItemAsync('edustream_refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const tokens = await authService.login(email, password);
    await SecureStore.setItemAsync('edustream_access_token', tokens.access);
    await SecureStore.setItemAsync('edustream_refresh_token', tokens.refresh);
    const me = await authService.getMe();
    setUser(me);
  };

  const register = async (payload: { email: string; full_name: string; role: string; password: string }) => {
    await authService.register(payload);
    await login(payload.email, payload.password);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('edustream_access_token');
    await SecureStore.deleteItemAsync('edustream_refresh_token');
    setUser(null);
  };

  const updateUser = async (data: Partial<AuthUser>) => {
    const updated = await authService.updateMe(data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
