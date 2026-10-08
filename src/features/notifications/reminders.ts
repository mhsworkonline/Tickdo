import * as Notifications from 'expo-notifications';
import type { TFunction } from 'i18next';
import { Platform } from 'react-native';

import type { Repositories } from '@/data/repositories';
import { SNOOZE_MINUTES } from '@/domain/dose-status';
import { DAY_MS, format12h, istMinutesOfDay, MINUTE_MS } from '@/domain/time';
import { formatQuantity } from '@/ui/format';
import {
  MAX_SCHEDULED,
  MAX_SCHEDULED_IOS,
  parseReminderId,
  planReminders,
  PLAN_HORIZON_MS,
  type PlannedReminder,
} from '@/features/notifications/plan';

export const DOSE_CHANNEL = 'doses';
export const REFILL_CHANNEL = 'refills';
export const CAREGIVER_CHANNEL = 'caregiver';
export const DOSE_CATEGORY = 'dose';
export const ACTION = { taken: 'TAKEN', snooze: 'SNOOZE', skip: 'SKIP' } as const;

export const KV_LAST_SYNC = 'reminders.lastSyncAt';
export const KV_LAST_SYNC_COUNT = 'reminders.lastSyncCount';

/** Safe to call repeatedly (e.g. after a language change, to re-label the action buttons). */
export async function configureNotifications(t: TFunction): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DOSE_CHANNEL, {
      name: t('notif.channelDoses'),
      description: t('notif.channelDosesDescription'),
      // Uses the system default notification sound (a named sound would need a bundled file).
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(REFILL_CHANNEL, {
      name: t('notif.channelRefills'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(CAREGIVER_CHANNEL, {
      name: t('notif.channelCaregiver'),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [
    { identifier: ACTION.taken, buttonTitle: t('notif.actionTaken'), options: { opensAppToForeground: false } },
    { identifier: ACTION.snooze, buttonTitle: t('notif.actionSnooze'), options: { opensAppToForeground: false } },
    { identifier: ACTION.skip, buttonTitle: t('notif.actionSkip'), options: { opensAppToForeground: false } },
  ]);
}

function content(p: PlannedReminder, t: TFunction): Notifications.NotificationContentInput {
  const name = [p.medicine.name, p.medicine.strength].filter(Boolean).join(' ');
  const time = format12h(istMinutesOfDay(p.dose.scheduledAt));
  return {
    title: t(p.isSnooze ? 'notif.titleSnoozed' : 'notif.title', { name }),
    body: t('notif.body', { quantity: formatQuantity(p.dose.quantity), form: t(`forms.${p.medicine.form}`), time }),
    data: {
      kind: 'dose',
      medicineId: p.dose.medicineId,
      scheduledAt: p.dose.scheduledAt,
      quantity: p.dose.quantity,
      fireAt: p.fireAt,
    },
    categoryIdentifier: DOSE_CATEGORY,
    sound: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
    // iOS: break through Focus modes like an alarm would (needs the time-sensitive entitlement).
    interruptionLevel: 'timeSensitive',
  };
}

/**
 * Makes the device's scheduled dose reminders match the plan. Only changed reminders are
 * cancelled/created. Returns the number of dose reminders scheduled afterwards.
 */
export async function syncReminders(repos: Repositories, profileId: string, t: TFunction, now = Date.now()): Promise<number> {
  const medicines = await repos.medicines.list(profileId);
  const events = await repos.doses.eventsBetween(now - 2 * DAY_MS, now + PLAN_HORIZON_MS + DAY_MS);
  const plan = planReminders(medicines, events, now, PLAN_HORIZON_MS, Platform.OS === 'ios' ? MAX_SCHEDULED_IOS : MAX_SCHEDULED);

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const wanted = new Map(plan.map((p) => [p.identifier, p]));
  const keep = new Set<string>();

  for (const req of existing) {
    if (!req.identifier.startsWith('dose:')) continue;
    const p = wanted.get(req.identifier);
    const c = p ? content(p, t) : null;
    const same =
      p &&
      c &&
      req.content.data?.fireAt === p.fireAt &&
      req.content.title === c.title &&
      req.content.body === c.body;
    if (same) keep.add(req.identifier);
    else await Notifications.cancelScheduledNotificationAsync(req.identifier);
  }

  for (const p of plan) {
    if (keep.has(p.identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: p.identifier,
      content: content(p, t),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.fireAt, channelId: DOSE_CHANNEL },
    });
  }

  await repos.kv.set(KV_LAST_SYNC, String(now));
  await repos.kv.set(KV_LAST_SYNC_COUNT, String(plan.length));
  return plan.length;
}

export type DoseAction = 'taken' | 'skipped' | 'snoozed';

export function actionFromIdentifier(id: string): DoseAction | null {
  if (id === ACTION.taken) return 'taken';
  if (id === ACTION.skip) return 'skipped';
  if (id === ACTION.snooze) return 'snoozed';
  return null;
}

/**
 * Records a Taken / Snooze / Skip button press from a notification into the dose log.
 * Used both by the foreground listener and by the background task (app closed).
 */
export async function handleDoseAction(
  repos: Repositories,
  notificationId: string,
  data: Record<string, unknown> | undefined,
  action: DoseAction,
  now = Date.now(),
): Promise<boolean> {
  const parsed = parseReminderId(notificationId);
  const medicineId = typeof data?.medicineId === 'string' ? data.medicineId : parsed?.medicineId;
  const scheduledAt = typeof data?.scheduledAt === 'number' ? data.scheduledAt : parsed?.scheduledAt;
  const quantity = typeof data?.quantity === 'number' ? data.quantity : 1;
  if (!medicineId || scheduledAt === undefined) return false;
  if (!(await repos.medicines.get(medicineId))) return false;

  await repos.doses.record({
    medicineId,
    scheduledAt,
    kind: action,
    via: 'notification',
    quantity,
    snoozeUntil: action === 'snoozed' ? now + SNOOZE_MINUTES * MINUTE_MS : null,
  });
  await Notifications.dismissNotificationAsync(notificationId).catch(() => undefined);
  return true;
}

/** Fires a sample reminder in a few seconds so the user can check sound, banner and buttons. */
export async function sendTestNotification(t: TFunction): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notif.testTitle'),
      body: t('notif.testBody'),
      data: { kind: 'test' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: DOSE_CHANNEL },
  });
}

export async function scheduledReminderCount(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((r) => r.identifier.startsWith('dose:')).length;
}
