import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold, Mukta_700Bold } from '@expo-google-fonts/mukta';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { openDatabase } from '@/data/database';
import type { Repositories } from '@/data/repositories';
import type { Plan } from '@/domain/entitlements';
import { actionFromIdentifier, configureNotifications, handleDoseAction } from '@/features/notifications/reminders';
import { deviceLanguage, i18n, initI18n } from '@/i18n';
import { registerBackgroundTasks } from '@/services/background-tasks';
import { AppServicesProvider, useServices } from '@/services/AppServices';
import { runMaintenance } from '@/services/maintenance';
import { KV_PLAN } from '@/services/steps';
import { AppStateProvider, useAppState } from '@/state/app-state';
import { loadPreferences, type Preferences } from '@/storage/preferences';
import { palette } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

type Boot = { prefs: Preferences; repos: Repositories; profileId: string; plan: Plan };

export default function RootLayout() {
  const scheme = useColorScheme();
  const [boot, setBoot] = useState<Boot | null>(null);
  const [bootKey, setBootKey] = useState(0);
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Mukta_400Regular,
    Mukta_500Medium,
    Mukta_600SemiBold,
    Mukta_700Bold,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = await loadPreferences();
      await initI18n(prefs.language ?? deviceLanguage());
      const { repos } = await openDatabase();
      const profileId = await repos.profiles.ensureDefault('');
      const plan: Plan = (await repos.kv.get(KV_PLAN)) === 'plus' ? 'plus' : 'free';
      // Never let notification setup block the app from opening; Diagnostics shows the state.
      await configureNotifications(i18n.t.bind(i18n)).catch((e: unknown) => {
        console.warn('notification setup failed', e instanceof Error ? e.message : e);
      });
      registerBackgroundTasks().catch(() => undefined);
      runMaintenance().catch(() => undefined);
      if (!cancelled) setBoot({ prefs, repos, profileId, plan });
    })();
    return () => {
      cancelled = true;
    };
  }, [bootKey]);

  useEffect(() => {
    if (boot && fontsLoaded) SplashScreen.hide();
  }, [boot, fontsLoaded]);

  if (!boot || !fontsLoaded) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = scheme === 'dark' ? palette.dark : palette.light;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.surface, primary: colors.primary, text: colors.text, border: colors.border },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppStateProvider
        key={bootKey}
        initial={boot.prefs}
        onReset={() => {
          setBoot(null);
          setBootKey((k) => k + 1);
        }}>
        <AppServicesProvider repos={boot.repos} profileId={boot.profileId} initialPlan={boot.plan}>
          <NotificationResponses />
          <RootStack />
        </AppServicesProvider>
      </AppStateProvider>
    </ThemeProvider>
  );
}

/** Foreground handling of reminder buttons; taps on the reminder itself open Today. */
function NotificationResponses() {
  const { repos, changed } = useServices();
  useEffect(() => {
    const handle = async (response: Notifications.NotificationResponse) => {
      const req = response.notification.request;
      const action = actionFromIdentifier(response.actionIdentifier);
      if (action) {
        await handleDoseAction(repos, req.identifier, req.content.data, action);
        changed();
      } else if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        router.navigate('/');
      }
      Notifications.clearLastNotificationResponse();
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) handle(last).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      handle(r).catch(() => undefined);
    });
    return () => sub.remove();
  }, [repos, changed]);
  return null;
}

function RootStack() {
  const { language, disclaimerAcceptedAt, onboardedAt } = useAppState();
  const onboarded = language !== null && disclaimerAcceptedAt !== null && onboardedAt !== null;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="medicine" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="caregiver" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
