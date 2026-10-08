import type { SqlDb } from '@/data/sql';

/**
 * Forward-only migrations. The applied version is stored in PRAGMA user_version.
 * Never edit a released migration; add a new one.
 */
export const MIGRATIONS: readonly { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE scans (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        photo_uri TEXT,
        photo_deleted_at INTEGER,
        status TEXT NOT NULL CHECK (status IN ('captured', 'reviewing', 'done', 'failed')),
        ocr_line_count INTEGER NOT NULL DEFAULT 0,
        candidate_count INTEGER NOT NULL DEFAULT 0,
        confirmed_unchanged INTEGER NOT NULL DEFAULT 0,
        confirmed_edited INTEGER NOT NULL DEFAULT 0,
        removed INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE medicines (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        catalog_id TEXT,
        strength TEXT,
        form TEXT NOT NULL,
        frequency TEXT NOT NULL,
        units_on_hand REAL,
        active INTEGER NOT NULL DEFAULT 1,
        stopped_at INTEGER,
        start_date TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('manual', 'scan')),
        scan_id TEXT REFERENCES scans(id) ON DELETE SET NULL,
        scan_source_text TEXT,
        scan_confirmed_at INTEGER,
        color INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CHECK (source = 'manual' OR (scan_source_text IS NOT NULL AND scan_confirmed_at IS NOT NULL))
      );
      CREATE INDEX medicines_profile ON medicines(profile_id, active);

      CREATE TABLE medicine_times (
        medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
        minutes INTEGER NOT NULL CHECK (minutes BETWEEN 0 AND 1439),
        quantity REAL NOT NULL CHECK (quantity > 0),
        PRIMARY KEY (medicine_id, minutes)
      );

      CREATE TABLE dose_events (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
        scheduled_at INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('taken', 'skipped', 'snoozed', 'cleared', 'missed')),
        recorded_at INTEGER NOT NULL,
        snooze_until INTEGER,
        via TEXT NOT NULL CHECK (via IN ('app', 'notification', 'system'))
      );
      CREATE INDEX dose_events_time ON dose_events(scheduled_at);
      CREATE INDEX dose_events_medicine ON dose_events(medicine_id, scheduled_at);


      CREATE TABLE kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export async function migrate(db: SqlDb): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await db.transaction(async () => {
      await db.execAsync(m.sql);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  return current;
}
