import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../theme/colors';

interface AlertOptions {
  title: string;
  message?: string;
  confirm?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
}

interface AlertContextValue {
  alert: (opts: AlertOptions) => Promise<void>;
  confirm: (opts: AlertOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextValue>({
  alert: async () => {},
  confirm: async () => false,
});

export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({ title: '' });
  const [resolver, setResolver] = useState<((value: void | boolean) => void) | null>(null);

  const alert = useCallback((opts: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setOptions({ ...opts, confirm: false });
      setVisible(true);
      setResolver(() => resolve);
    });
  }, []);

  const confirm = useCallback((opts: AlertOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions({ ...opts, confirm: true });
      setVisible(true);
      setResolver(() => resolve);
    });
  }, []);

  const dismiss = (result: void | boolean = true) => {
    setVisible(false);
    resolver?.(result);
  };

  return (
    <AlertContext.Provider value={{ alert, confirm }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => dismiss(false)}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <ThemedView variant="card" rounded="2xl" style={styles.dialog}>
            <ThemedText variant="h3" bold style={{ textAlign: 'center' }}>{options.title}</ThemedText>
            {options.message ? (
              <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>{options.message}</ThemedText>
            ) : null}
            {options.confirm ? (
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing['2xl'], alignSelf: 'stretch' }}>
                <TouchableOpacity
                  onPress={() => dismiss(false)}
                  style={[styles.button, { backgroundColor: colors.surfaceSecondary, flex: 1 }]}
                >
                  <ThemedText style={{ color: colors.text, fontSize: FontSize.lg }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { options.onConfirm?.(); dismiss(true); }}
                  style={[styles.button, { backgroundColor: colors.error || '#ef4444', flex: 1 }]}
                >
                  <ThemedText bold style={{ color: '#fff', fontSize: FontSize.lg }}>{options.confirmLabel || 'Delete'}</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => dismiss()}
                style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing['2xl'] }]}
              >
                <ThemedText bold style={{ color: '#fff', fontSize: FontSize.lg }}>OK</ThemedText>
              </TouchableOpacity>
            )}
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
