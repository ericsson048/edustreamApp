import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en';
import fr from './fr';
import rn from './rn';

const resources = { en: { translation: en }, fr: { translation: fr }, rn: { translation: rn } };

i18n.use(initReactI18next).init({
  resources,
  lng: (Localization as any).getLocales?.()?.[0]?.languageCode || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
