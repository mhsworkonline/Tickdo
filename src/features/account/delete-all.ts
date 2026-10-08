import * as Notifications from 'expo-notifications';
import { Directory, File, Paths } from 'expo-file-system';

import { destroyDatabase } from '@/data/database';
import { clearPreferences } from '@/storage/preferences';

export type ServerDeletion = 'done' | 'skipped' | 'failed';

/** Set by the account feature (Deliverable 6): deletes server data and verifies it is gone. */
let deleteServerData: (() => Promise<ServerDeletion>) | null = null;
export function registerServerDeletion(fn: () => Promise<ServerDeletion>) {
  deleteServerData = fn;
}

export const SCAN_PHOTO_DIR = 'scans';

export type DeleteReport = { local: boolean; server: ServerDeletion };

/**
 * Deletes everything: server data first (needs the session, which lives in the local DB),
 * then reminders, scan photos, the encrypted database and its key, and preferences.
 * Local deletion is verified by checking the database file no longer exists.
 */
export async function deleteAllData(): Promise<DeleteReport> {
  let server: ServerDeletion = 'skipped';
  if (deleteServerData) {
    try {
      server = await deleteServerData();
    } catch {
      server = 'failed';
    }
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();

  const photos = new Directory(Paths.document, SCAN_PHOTO_DIR);
  if (photos.exists) photos.delete();

  await destroyDatabase();
  await clearPreferences();

  const dbFile = new File(Paths.document, 'SQLite', 'tickdo.db');
  return { local: !dbFile.exists && !photos.exists, server };
}
