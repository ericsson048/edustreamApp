import { useState } from 'react';
import { View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing } from '../theme/colors';

const LANGUAGES = [
  { code: 'en', label: 'language.en', icon: 'us' as const },
  { code: 'fr', label: 'language.fr', icon: 'fr' as const },
  { code: 'rn', label: 'language.rn', icon: 'flag' as const },
];

export function LanguageSwitcher() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);

  const currentLang = i18n.language?.slice(0, 2) || 'en';

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={{ padding: 4 }} accessibilityLabel="Switch language">
        <Ionicons name="language-outline" size={22} color={colors.text} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setVisible(false)}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: colors.background, borderRadius: 16, padding: Spacing.xl, minWidth: 260 }}>
            <ThemedText variant="h3" bold style={{ marginBottom: Spacing.md, textAlign: 'center' }}>
              {t('more.settings')}
            </ThemedText>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => { i18n.changeLanguage(lang.code); setVisible(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: Spacing.md,
                  borderRadius: 12,
                  backgroundColor: currentLang === lang.code ? colors.primaryLight : 'transparent',
                  marginBottom: 4,
                }}
              >
                <Ionicons
                  name={currentLang === lang.code ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={currentLang === lang.code ? colors.primary : colors.textMuted}
                />
                <ThemedText style={{ marginLeft: Spacing.md, color: colors.text, fontWeight: currentLang === lang.code ? '600' : '400' }}>
                  {t(lang.label)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
