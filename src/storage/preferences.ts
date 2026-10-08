import * as SecureStore from 'expo-secure-store';

import { isLanguage, type Language } from '@/i18n';

/**
 * Small, non-health app preferences. Health data lives in the encrypted SQLite
 * database (Deliverable 2), not here.
 */
const KEYS = {
  language: 'pref.language',
  disclaimerAcceptedAt: 'pref.disclaimerAcceptedAt',
} as const;

export type Preferences = {
  language: Language | null;
  disclaimerAcceptedAt: string | null;
};

export async function loadPreferences(): Promise<Preferences> {
  const [language, disclaimerAcceptedAt] = await Promise.all([
    SecureStore.getItemAsync(KEYS.language),
    SecureStore.getItemAsync(KEYS.disclaimerAcceptedAt),
  ]);
  return {
    language: isLanguage(language) ? language : null,
    disclaimerAcceptedAt,
  };
}

export function saveLanguage(language: Language): Promise<void> {
  return SecureStore.setItemAsync(KEYS.language, language);
}

export function saveDisclaimerAccepted(at: Date): Promise<void> {
  return SecureStore.setItemAsync(KEYS.disclaimerAcceptedAt, at.toISOString());
}

export async function clearPreferences(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
}
