import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { deviceLanguage, initI18n } from '@/i18n';
import { AppStateProvider, useAppState } from '@/state/app-state';
import { loadPreferences, type Preferences } from '@/storage/preferences';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const [prefs, setPrefs] = useState<Preferences | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadPreferences();
      await initI18n(loaded.language ?? deviceLanguage());
      if (!cancelled) setPrefs(loaded);
      SplashScreen.hide();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!prefs) return null;

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppStateProvider initial={prefs}>
        <RootStack />
      </AppStateProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { language, disclaimerAcceptedAt } = useAppState();
  const onboarded = language !== null && disclaimerAcceptedAt !== null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
