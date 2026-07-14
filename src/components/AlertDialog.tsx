import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../theme/colors';

interface AlertOptions {
  title: string;
  message?: string;
}

interface AlertContextValue {
  alert: (opts: AlertOptions) => Promise<void>;
}

const AlertContext = createContext<AlertContextValue>({
  alert: async () => {},
});

export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({ title: '' });
  const [resolver, setResolver] = useState<((value: void) => void) | null>(null);

  const alert = useCallback((opts: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setOptions(opts);
      setVisible(true);
      setResolver(() => resolve);
    });
  }, []);

  const dismiss = () => {
    setVisible(false);
    resolver?.();
  };

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <ThemedView variant="card" rounded="2xl" style={styles.dialog}>
            <ThemedText variant="h3" bold style={{ textAlign: 'center' }}>{options.title}</ThemedText>
            {options.message ? (
              <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>{options.message}</ThemedText>
            ) : null}
            <TouchableOpacity
              onPress={dismiss}
              style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}
            >
              <ThemedText bold style={{ color: '#fff', fontSize: FontSize.lg }}>OK</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'],
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    padding: Spacing['2xl'],
    alignItems: 'center',
  },
  button: {
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    alignSelf: 'stretch',
  },
});
