import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { migrate } from '@/data/migrations';
import { createRepositories, type Repositories } from '@/data/repositories';
import type { SqlDb, SqlValue } from '@/data/sql';

/**
 * The on-device database. Encrypted at rest with SQLCipher (expo-sqlite `useSQLCipher`).
 * The 256-bit key is random per install and lives in SecureStore (Android Keystore / iOS Keychain),
 * never in the database or in code.
 */
const DB_NAME = 'tickdo.db';
const KEY_NAME = 'db.key.v1';

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, hex, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  return hex;
}

function adapt(native: SQLite.SQLiteDatabase): SqlDb {
  // expo-sqlite transactions do not nest and other queries can interleave with them, so all
  // work is serialised through one queue. Calls made inside a transaction run directly.
  let queue: Promise<unknown> = Promise.resolve();
  let inTransaction = false;
  let savepoint = 0;

  const run = <T>(fn: () => Promise<T>): Promise<T> => {
    if (inTransaction) return fn();
    const next = queue.then(fn, fn);
    queue = next.catch(() => undefined);
    return next;
  };

  const params = (p: readonly SqlValue[] = []) => p as SqlValue[];

  return {
    execAsync: (sql) => run(() => native.execAsync(sql)),
    runAsync: (sql, p) => run(async () => ({ changes: (await native.runAsync(sql, params(p))).changes })),
    getAllAsync: <T>(sql: string, p?: readonly SqlValue[]) => run(() => native.getAllAsync<T>(sql, params(p))),
    getFirstAsync: <T>(sql: string, p?: readonly SqlValue[]) => run(() => native.getFirstAsync<T>(sql, params(p))),
    transaction: (fn) =>
      run(async () => {
        const outer = !inTransaction;
        const sp = `sp${savepoint++}`;
        inTransaction = true;
        await native.execAsync(`SAVEPOINT ${sp}`);
        try {
          await fn();
          await native.execAsync(`RELEASE ${sp}`);
        } catch (e) {
          await native.execAsync(`ROLLBACK TO ${sp}; RELEASE ${sp}`);
          throw e;
        } finally {
          savepoint--;
          if (outer) inTransaction = false;
        }
      }),
  };
}

let opened: Promise<{ native: SQLite.SQLiteDatabase; db: SqlDb; repos: Repositories }> | null = null;

export function openDatabase() {
  if (!opened) {
    opened = (async () => {
      const key = await getOrCreateKey();
      const native = await SQLite.openDatabaseAsync(DB_NAME);
      await native.execAsync(`PRAGMA key = "x'${key}'"`);
      await native.execAsync('PRAGMA journal_mode = WAL;');
      const db = adapt(native);
      await migrate(db);
      const repos = createRepositories(db, { newId: Crypto.randomUUID, now: Date.now });
      return { native, db, repos };
    })();
    opened.catch(() => {
      opened = null;
    });
  }
  return opened;
}

/** Permanently deletes the database file and its key. */
export async function destroyDatabase(): Promise<void> {
  if (opened) {
    const { native } = await opened;
    await native.closeAsync();
    opened = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => undefined);
  await SecureStore.deleteItemAsync(KEY_NAME);
}
