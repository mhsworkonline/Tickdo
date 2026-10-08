import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { initI18n, type Language } from '@/i18n';
import { saveDisclaimerAccepted, saveLanguage, type Preferences } from '@/storage/preferences';

type AppState = Preferences & {
  setLanguage: (language: Language) => Promise<void>;
  acceptDisclaimer: () => Promise<void>;
};

const AppStateContext = createContext<AppState | null>(null);

type Props = { initial: Preferences; children: ReactNode };

export function AppStateProvider({ initial, children }: Props) {
  const [prefs, setPrefs] = useState<Preferences>(initial);

  const setLanguage = useCallback(async (language: Language) => {
    await saveLanguage(language);
    await initI18n(language);
    setPrefs((p) => ({ ...p, language }));
  }, []);

  const acceptDisclaimer = useCallback(async () => {
    const at = new Date();
    await saveDisclaimerAccepted(at);
    setPrefs((p) => ({ ...p, disclaimerAcceptedAt: at.toISOString() }));
  }, []);

  const value = useMemo(() => ({ ...prefs, setLanguage, acceptDisclaimer }), [prefs, setLanguage, acceptDisclaimer]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}
