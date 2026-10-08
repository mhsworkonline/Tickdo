/**
 * Background work. This file is imported from the app entry (index.ts) so the tasks are
 * defined before React mounts, which is required for headless (app closed) execution.
 *
 * - NOTIFICATION_TASK: Taken / Snooze / Skip pressed on a reminder while the app is closed.
 * - MAINTENANCE_TASK: periodic (WorkManager on Android, survives reboot) re-planning.
 * After a reboot, expo-notifications itself re-arms already scheduled alarms; the periodic task
 * then refreshes the rolling window.
 */
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { openDatabase } from '@/data/database';
import { actionFromIdentifier, handleDoseAction } from '@/features/notifications/reminders';
import { runMaintenance } from '@/services/maintenance';
import '@/services/steps';

export const NOTIFICATION_TASK = 'tickdo-notification-response';
export const MAINTENANCE_TASK = 'tickdo-maintenance';

type ResponseLike = {
  actionIdentifier: string;
  notification: { request: { identifier: string; content: { data?: Record<string, unknown> } } };
};

function isResponse(value: unknown): value is ResponseLike {
  return typeof value === 'object' && value !== null && 'actionIdentifier' in value && 'notification' in value;
}

TaskManager.defineTask<unknown>(NOTIFICATION_TASK, async ({ data, error }) => {
  if (error || !isResponse(data)) return;
  const action = actionFromIdentifier(data.actionIdentifier);
  if (!action) return;
  const { repos } = await openDatabase();
  const req = data.notification.request;
  await handleDoseAction(repos, req.identifier, req.content.data, action);
  await runMaintenance();
});

TaskManager.defineTask(MAINTENANCE_TASK, async () => {
  try {
    await runMaintenance();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundTasks(): Promise<void> {
  await Notifications.registerTaskAsync(NOTIFICATION_TASK).catch(() => undefined);
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Available) {
    await BackgroundTask.registerTaskAsync(MAINTENANCE_TASK, { minimumInterval: 6 * 60 }).catch(() => undefined);
  }
}
