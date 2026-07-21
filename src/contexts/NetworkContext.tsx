import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface NetworkContextValue {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isConnected: true });

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const NetInfo = await import('@react-native-community/netinfo');
        const state = await NetInfo.default.fetch();
        setIsConnected(state.isConnected ?? true);
        unsub = NetInfo.default.addEventListener((s) => {
          setIsConnected(s.isConnected ?? true);
        });
      } catch {}
    })();
    return () => { unsub?.(); };
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
