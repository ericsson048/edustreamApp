import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, type ColorScheme } from '../theme/colors';

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: typeof Colors.light;
  toggleScheme: () => void;
  isDark: boolean;
}

const defaultScheme: ColorScheme = 'light';

const ThemeContext = createContext<ThemeContextValue>({
  scheme: defaultScheme,
  colors: Colors[defaultScheme],
  toggleScheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [scheme, setScheme] = useState<ColorScheme>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    AsyncStorage.getItem('edustream_theme').then((stored) => {
      if (stored === 'light' || stored === 'dark') setScheme(stored);
    });
  }, []);

  const toggleScheme = () => {
    const next = scheme === 'light' ? 'dark' : 'light';
    setScheme(next);
    AsyncStorage.setItem('edustream_theme', next);
  };

  const value: ThemeContextValue = {
    scheme,
    colors: Colors[scheme],
    toggleScheme,
    isDark: scheme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
