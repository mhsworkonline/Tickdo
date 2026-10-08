import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import hi from '@/i18n/locales/hi.json';

const i18n = createInstance();

export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(value: string | null | undefined): value is Language {
  return SUPPORTED_LANGUAGES.some((lang) => lang === value);
}

export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return isLanguage(code) ? code : 'en';
}

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
} as const;

export function initI18n(language: Language): Promise<unknown> {
  if (i18n.isInitialized) {
    return i18n.changeLanguage(language);
  }
  return i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export { i18n };
