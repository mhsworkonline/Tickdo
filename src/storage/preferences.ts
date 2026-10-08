import * as SecureStore from 'expo-secure-store';

import { isLanguage, type Language } from '@/i18n';

/**
 * Small, non-health app preferences. Health data lives in the encrypted SQLite
 * database, not here.
 */
const KEYS = {
  language: 'pref.language',
  disclaimerAcceptedAt: 'pref.disclaimerAcceptedAt',
  onboardedAt: 'pref.onboardedAt',
} as const;

export type Preferences = {
  language: Language | null;
  disclaimerAcceptedAt: string | null;
  onboardedAt: string | null;
};

export async function loadPreferences(): Promise<Preferences> {
  const [language, disclaimerAcceptedAt, onboardedAt] = await Promise.all([
    SecureStore.getItemAsync(KEYS.language),
    SecureStore.getItemAsync(KEYS.disclaimerAcceptedAt),
    SecureStore.getItemAsync(KEYS.onboardedAt),
  ]);
  return {
    language: isLanguage(language) ? language : null,
    disclaimerAcceptedAt,
    onboardedAt,
  };
}

export function saveLanguage(language: Language): Promise<void> {
  return SecureStore.setItemAsync(KEYS.language, language);
}

export function saveDisclaimerAccepted(at: Date): Promise<void> {
  return SecureStore.setItemAsync(KEYS.disclaimerAcceptedAt, at.toISOString());
}

export function saveOnboarded(at: Date): Promise<void> {
  return SecureStore.setItemAsync(KEYS.onboardedAt, at.toISOString());
}

export async function clearPreferences(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
}
