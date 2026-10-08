import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { initI18n, i18n, type Language } from '@/i18n';
import { configureNotifications } from '@/features/notifications/reminders';
import { saveDisclaimerAccepted, saveLanguage, saveOnboarded, type Preferences } from '@/storage/preferences';

type AppState = Preferences & {
  setLanguage: (language: Language) => Promise<void>;
  acceptDisclaimer: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
  /** Back to first-run state after "delete all data". */
  reset: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

type Props = { initial: Preferences; onReset?: () => void; children: ReactNode };

export function AppStateProvider({ initial, onReset, children }: Props) {
  const [prefs, setPrefs] = useState<Preferences>(initial);

  const setLanguage = useCallback(async (language: Language) => {
    await saveLanguage(language);
    await initI18n(language);
    setPrefs((p) => ({ ...p, language }));
    // Re-label notification action buttons in the new language.
    configureNotifications(i18n.t.bind(i18n)).catch(() => undefined);
  }, []);

  const acceptDisclaimer = useCallback(async () => {
    const at = new Date();
    await saveDisclaimerAccepted(at);
    setPrefs((p) => ({ ...p, disclaimerAcceptedAt: at.toISOString() }));
  }, []);

  const finishOnboarding = useCallback(async () => {
    const at = new Date();
    await saveOnboarded(at);
    setPrefs((p) => ({ ...p, onboardedAt: at.toISOString() }));
  }, []);

  const reset = useCallback(() => {
    setPrefs({ language: null, disclaimerAcceptedAt: null, onboardedAt: null });
    onReset?.();
  }, [onReset]);

  const value = useMemo(
    () => ({ ...prefs, setLanguage, acceptDisclaimer, finishOnboarding, reset }),
    [prefs, setLanguage, acceptDisclaimer, finishOnboarding, reset],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}
