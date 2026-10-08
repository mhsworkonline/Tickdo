import type { TFunction } from 'i18next';

import { openDatabase } from '@/data/database';
import { syncReminders } from '@/features/notifications/reminders';
import { i18n, initI18n, deviceLanguage } from '@/i18n';
import { loadPreferences } from '@/storage/preferences';

type Hook = (ctx: { t: TFunction; profileId: string; now: number }) => Promise<void>;

/** Other features (photo purge, refill alerts, caregiver sync) register extra steps here. */
const hooks: { name: string; run: Hook }[] = [];

export function registerMaintenanceStep(name: string, run: Hook) {
  if (!hooks.some((h) => h.name === name)) hooks.push({ name, run });
}

/**
 * Everything that keeps Tickdo correct when the app is not open: re-plans reminders (rolling
 * 3-day window), and runs registered steps. Called on app start, after changes, from the
 * periodic background task and from notification actions. Safe to run at any time.
 */
export async function runMaintenance(now = Date.now()): Promise<void> {
  if (!i18n.isInitialized) {
    const prefs = await loadPreferences();
    await initI18n(prefs.language ?? deviceLanguage());
  }
  const t = i18n.t.bind(i18n);
  const { repos } = await openDatabase();
  const profileId = await repos.profiles.ensureDefault('');
  await syncReminders(repos, profileId, t, now);
  for (const h of hooks) {
    try {
      await h.run({ t, profileId, now });
    } catch (e) {
      // One failing step must not stop the others. No health data in logs.
      console.warn(`maintenance step failed: ${h.name}`, e instanceof Error ? e.name : 'unknown');
    }
  }
}
