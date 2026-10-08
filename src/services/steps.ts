/**
 * Maintenance steps that run on app start, after changes, periodically in the background and
 * after notification actions. Imported from background-tasks.ts so they are always registered.
 */
import * as Notifications from 'expo-notifications';

import { openDatabase } from '@/data/database';
import { canUseCaregiverSharing, canUseRefillAlerts, type Plan } from '@/domain/entitlements';
import { MISS_LOOKBACK_MS, unrecordedMisses } from '@/domain/history';
import { daysRemaining, needsRefill } from '@/domain/refill';
import { DAY_MS, istDateKey } from '@/domain/time';
import { isServerConfigured } from '@/features/account/supabase';
import { myLink, syncSharedDoses } from '@/features/caregiver/api';
import { buildSharedDoses, SHARE_FUTURE_MS, SHARE_PAST_MS } from '@/features/caregiver/share';
import { REFILL_CHANNEL } from '@/features/notifications/reminders';
import { deletePhoto } from '@/features/scan/pipeline';
import { photosToDelete } from '@/features/scan/retention';
import { registerMaintenanceStep } from '@/services/maintenance';
// Registers server-side account deletion with delete-all.
import '@/features/account/auth';

export const KV_PLAN = 'plan.current';

export async function cachedPlan(): Promise<Plan> {
  const { repos } = await openDatabase();
  return (await repos.kv.get(KV_PLAN)) === 'plus' ? 'plus' : 'free';
}

registerMaintenanceStep('record-misses', async ({ profileId, now }) => {
  const { repos } = await openDatabase();
  const medicines = await repos.medicines.list(profileId);
  const events = await repos.doses.eventsBetween(now - MISS_LOOKBACK_MS - DAY_MS, now + DAY_MS);
  await repos.doses.recordMisses(unrecordedMisses(medicines, events, now));
});

registerMaintenanceStep('refill-alerts', async ({ profileId, now, t }) => {
  if (!canUseRefillAlerts(await cachedPlan())) return;
  const { repos } = await openDatabase();
  const today = istDateKey(now);
  for (const m of await repos.medicines.list(profileId)) {
    if (!needsRefill(m)) continue;
    const key = `refill.alerted.${m.id}`;
    if ((await repos.kv.get(key)) === today) continue; // at most once a day per medicine
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notif.refillTitle', { name: m.name }),
        body: t('notif.refillBody', { days: daysRemaining(m) ?? 0 }),
        data: { kind: 'refill', medicineId: m.id },
      },
      trigger: { channelId: REFILL_CHANNEL, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    });
    await repos.kv.set(key, today);
  }
});

registerMaintenanceStep('purge-scan-photos', async ({ now }) => {
  const { repos } = await openDatabase();
  for (const p of photosToDelete(await repos.scans.withPhotos(), now)) {
    deletePhoto(p.photoUri);
    await repos.scans.markPhotoDeleted(p.id);
  }
});

/**
 * Caregiver sharing (Plus): while a caregiver has accepted, keep the server copy of the ±2 day
 * dose window current so the server can alert them about late doses. When sharing is off or the
 * plan has lapsed, nothing is uploaded; revoking deletes what was shared.
 */
registerMaintenanceStep('caregiver-sync', async ({ profileId, now }) => {
  if (!isServerConfigured || !canUseCaregiverSharing(await cachedPlan())) return;
  const link = await myLink();
  if (link?.status !== 'accepted') return;
  const { repos } = await openDatabase();
  const medicines = await repos.medicines.list(profileId);
  const events = await repos.doses.eventsBetween(now - SHARE_PAST_MS - DAY_MS, now + SHARE_FUTURE_MS);
  await syncSharedDoses(buildSharedDoses(medicines, events, now), now);
});
