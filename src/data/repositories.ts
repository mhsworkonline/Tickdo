import { adjustStock } from '@/domain/refill';
import type { DateKey } from '@/domain/time';
import type {
  DoseEvent,
  DoseEventKind,
  DoseEventVia,
  DoseTime,
  FrequencyPreset,
  Medicine,
  MedicineForm,
  MedicineSource,
} from '@/domain/types';
import type { SqlDb } from '@/data/sql';

export type Deps = { newId: () => string; now: () => number };

type MedicineRow = {
  id: string;
  profile_id: string;
  name: string;
  catalog_id: string | null;
  strength: string | null;
  form: string;
  frequency: string;
  units_on_hand: number | null;
  active: number;
  stopped_at: number | null;
  start_date: string;
  source: string;
  scan_id: string | null;
  scan_source_text: string | null;
  scan_confirmed_at: number | null;
  color: number;
  created_at: number;
  updated_at: number;
};

type TimeRow = { medicine_id: string; minutes: number; quantity: number };

type EventRow = {
  id: string;
  medicine_id: string;
  scheduled_at: number;
  kind: string;
  recorded_at: number;
  snooze_until: number | null;
  via: string;
};

/** What a user enters or confirms. Everything else is derived. */
export type MedicineInput = {
  name: string;
  catalogId: string | null;
  strength: string | null;
  form: MedicineForm;
  frequency: FrequencyPreset;
  times: DoseTime[];
  unitsOnHand: number | null;
  startDate: DateKey;
};

export type ScanOrigin = { scanId: string | null; sourceText: string };

export type ScanRecord = { id: string; createdAt: number; photoUri: string | null; status: string };

function toMedicine(row: MedicineRow, times: DoseTime[]): Medicine {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    catalogId: row.catalog_id,
    strength: row.strength,
    form: row.form as MedicineForm,
    frequency: row.frequency as FrequencyPreset,
    times,
    unitsOnHand: row.units_on_hand,
    active: row.active === 1,
    stoppedAt: row.stopped_at,
    startDate: row.start_date,
    source: row.source as MedicineSource,
    scanId: row.scan_id,
    scanSourceText: row.scan_source_text,
    scanConfirmedAt: row.scan_confirmed_at,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: EventRow): DoseEvent {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    scheduledAt: row.scheduled_at,
    kind: row.kind as DoseEventKind,
    recordedAt: row.recorded_at,
    snoozeUntil: row.snooze_until,
    via: row.via as DoseEventVia,
  };
}

export function createRepositories(db: SqlDb, deps: Deps) {
  async function timesFor(ids: readonly string[]): Promise<Map<string, DoseTime[]>> {
    const map = new Map<string, DoseTime[]>();
    if (ids.length === 0) return map;
    const rows = await db.getAllAsync<TimeRow>(
      `SELECT medicine_id, minutes, quantity FROM medicine_times WHERE medicine_id IN (${ids.map(() => '?').join(',')}) ORDER BY minutes`,
      ids,
    );
    for (const r of rows) {
      const list = map.get(r.medicine_id) ?? [];
      list.push({ minutes: r.minutes, quantity: r.quantity });
      map.set(r.medicine_id, list);
    }
    return map;
  }

  async function replaceTimes(medicineId: string, times: readonly DoseTime[]) {
    await db.runAsync('DELETE FROM medicine_times WHERE medicine_id = ?', [medicineId]);
    for (const t of times) {
      await db.runAsync('INSERT INTO medicine_times (medicine_id, minutes, quantity) VALUES (?, ?, ?)', [
        medicineId,
        t.minutes,
        t.quantity,
      ]);
    }
  }

  const profiles = {
    async ensureDefault(name: string): Promise<string> {
      const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM profiles ORDER BY created_at LIMIT 1');
      if (existing) return existing.id;
      const id = deps.newId();
      await db.runAsync('INSERT INTO profiles (id, name, created_at) VALUES (?, ?, ?)', [id, name, deps.now()]);
      return id;
    },
    async rename(id: string, name: string) {
      await db.runAsync('UPDATE profiles SET name = ? WHERE id = ?', [name, id]);
    },
    async get(id: string) {
      return db.getFirstAsync<{ id: string; name: string }>('SELECT id, name FROM profiles WHERE id = ?', [id]);
    },
    async count() {
      return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM profiles'))?.n ?? 0;
    },
  };

  const medicines = {
    async list(profileId: string, opts: { includeInactive?: boolean } = {}): Promise<Medicine[]> {
      const rows = await db.getAllAsync<MedicineRow>(
        `SELECT * FROM medicines WHERE profile_id = ? ${opts.includeInactive ? '' : 'AND active = 1'} ORDER BY created_at`,
        [profileId],
      );
      const times = await timesFor(rows.map((r) => r.id));
      return rows.map((r) => toMedicine(r, times.get(r.id) ?? []));
    },

    async get(id: string): Promise<Medicine | null> {
      const row = await db.getFirstAsync<MedicineRow>('SELECT * FROM medicines WHERE id = ?', [id]);
      if (!row) return null;
      return toMedicine(row, (await timesFor([id])).get(id) ?? []);
    },

    async countActive(profileId: string): Promise<number> {
      return (
        (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM medicines WHERE profile_id = ? AND active = 1', [
          profileId,
        ]))?.n ?? 0
      );
    },

    /**
     * Saves a medicine the user has explicitly confirmed. For scans, the source text and the
     * confirmation time are stored permanently with the medicine.
     */
    async create(profileId: string, input: MedicineInput, origin: ScanOrigin | null = null): Promise<string> {
      const id = deps.newId();
      const now = deps.now();
      const colorRow = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM medicines WHERE profile_id = ?', [
        profileId,
      ]);
      await db.transaction(async () => {
        await db.runAsync(
          `INSERT INTO medicines (id, profile_id, name, catalog_id, strength, form, frequency, units_on_hand, active,
             start_date, source, scan_id, scan_source_text, scan_confirmed_at, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            profileId,
            input.name.trim(),
            input.catalogId,
            input.strength?.trim() || null,
            input.form,
            input.frequency,
            input.unitsOnHand,
            input.startDate,
            origin ? 'scan' : 'manual',
            origin?.scanId ?? null,
            origin?.sourceText ?? null,
            origin ? now : null,
            colorRow?.n ?? 0,
            now,
            now,
          ],
        );
        await replaceTimes(id, input.frequency === 'as_needed' ? [] : input.times);
      });
      return id;
    },

    /** Edits never change `source` or the scan record. */
    async update(id: string, input: MedicineInput): Promise<void> {
      await db.transaction(async () => {
        await db.runAsync(
          `UPDATE medicines SET name = ?, catalog_id = ?, strength = ?, form = ?, frequency = ?, units_on_hand = ?,
             start_date = ?, updated_at = ? WHERE id = ?`,
          [
            input.name.trim(),
            input.catalogId,
            input.strength?.trim() || null,
            input.form,
            input.frequency,
            input.unitsOnHand,
            input.startDate,
            deps.now(),
            id,
          ],
        );
        await replaceTimes(id, input.frequency === 'as_needed' ? [] : input.times);
      });
    },

    async setActive(id: string, active: boolean) {
      const now = deps.now();
      await db.runAsync('UPDATE medicines SET active = ?, stopped_at = ?, updated_at = ? WHERE id = ?', [active ? 1 : 0, active ? null : now, now, id]);
    },

    async setUnitsOnHand(id: string, units: number | null) {
      await db.runAsync('UPDATE medicines SET units_on_hand = ?, updated_at = ? WHERE id = ?', [units, deps.now(), id]);
    },
  };

  const doses = {
    async eventsBetween(from: number, to: number): Promise<DoseEvent[]> {
      const rows = await db.getAllAsync<EventRow>(
        'SELECT * FROM dose_events WHERE scheduled_at >= ? AND scheduled_at < ? ORDER BY recorded_at',
        [from, to],
      );
      return rows.map(toEvent);
    },

    async eventsFor(medicineId: string, scheduledAt: number): Promise<DoseEvent[]> {
      const rows = await db.getAllAsync<EventRow>(
        'SELECT * FROM dose_events WHERE medicine_id = ? AND scheduled_at = ? ORDER BY recorded_at',
        [medicineId, scheduledAt],
      );
      return rows.map(toEvent);
    },

    /**
     * Appends an event and keeps stock in step: taking a dose subtracts its quantity,
     * undoing a taken dose adds it back. Recording "taken" twice only subtracts once.
     */
    async record(args: {
      medicineId: string;
      scheduledAt: number;
      kind: DoseEventKind;
      via: DoseEventVia;
      quantity: number;
      snoozeUntil?: number | null;
    }): Promise<DoseEvent> {
      const event: DoseEvent = {
        id: deps.newId(),
        medicineId: args.medicineId,
        scheduledAt: args.scheduledAt,
        kind: args.kind,
        recordedAt: deps.now(),
        snoozeUntil: args.snoozeUntil ?? null,
        via: args.via,
      };
      await db.transaction(async () => {
        const previous = await doses.eventsFor(args.medicineId, args.scheduledAt);
        const wasTaken = currentDecision(previous) === 'taken';
        await db.runAsync(
          `INSERT INTO dose_events (id, medicine_id, scheduled_at, kind, recorded_at, snooze_until, via)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [event.id, event.medicineId, event.scheduledAt, event.kind, event.recordedAt, event.snoozeUntil, event.via],
        );
        const isTaken = currentDecision([...previous, event]) === 'taken';
        if (wasTaken !== isTaken) {
          const med = await db.getFirstAsync<{ units_on_hand: number | null }>(
            'SELECT units_on_hand FROM medicines WHERE id = ?',
            [args.medicineId],
          );
          const next = adjustStock(med?.units_on_hand ?? null, isTaken ? -args.quantity : args.quantity);
          await db.runAsync('UPDATE medicines SET units_on_hand = ? WHERE id = ?', [next, args.medicineId]);
        }
      });
      return event;
    },

    /** Writes one `missed` record per dose that passed its window with no decision. */
    async recordMisses(misses: readonly { medicineId: string; scheduledAt: number }[]): Promise<number> {
      if (misses.length === 0) return 0;
      await db.transaction(async () => {
        for (const m of misses) {
          await db.runAsync(
            `INSERT INTO dose_events (id, medicine_id, scheduled_at, kind, recorded_at, snooze_until, via)
             VALUES (?, ?, ?, 'missed', ?, NULL, 'system')`,
            [deps.newId(), m.medicineId, m.scheduledAt, deps.now()],
          );
        }
      });
      return misses.length;
    },
  };

  const kv = {
    async get(key: string): Promise<string | null> {
      return (await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]))?.value ?? null;
    },
    async set(key: string, value: string) {
      await db.runAsync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
        key,
        value,
      ]);
    },
    async remove(key: string) {
      await db.runAsync('DELETE FROM kv WHERE key = ?', [key]);
    },
  };


  const scans = {
    async create(photoUri: string): Promise<string> {
      const id = deps.newId();
      await db.runAsync("INSERT INTO scans (id, created_at, photo_uri, status) VALUES (?, ?, ?, 'captured')", [id, deps.now(), photoUri]);
      return id;
    },
    async setResult(id: string, ocrLineCount: number, candidateCount: number) {
      await db.runAsync("UPDATE scans SET status = 'reviewing', ocr_line_count = ?, candidate_count = ? WHERE id = ?", [
        ocrLineCount,
        candidateCount,
        id,
      ]);
    },
    /** Counts only (no text) — used for the accuracy study. */
    async finish(id: string, counts: { confirmedUnchanged: number; confirmedEdited: number; removed: number }) {
      await db.runAsync(
        "UPDATE scans SET status = 'done', confirmed_unchanged = ?, confirmed_edited = ?, removed = ? WHERE id = ?",
        [counts.confirmedUnchanged, counts.confirmedEdited, counts.removed, id],
      );
    },
    async markPhotoDeleted(id: string) {
      await db.runAsync("UPDATE scans SET photo_uri = NULL, photo_deleted_at = ? WHERE id = ?", [deps.now(), id]);
    },
    async withPhotos(): Promise<ScanRecord[]> {
      return db.getAllAsync<ScanRecord>(
        "SELECT id, created_at AS createdAt, photo_uri AS photoUri, status FROM scans WHERE photo_uri IS NOT NULL",
      );
    },
    async stats(): Promise<{ scans: number; candidates: number; unchanged: number; edited: number; removed: number; empty: number }> {
      const r = await db.getFirstAsync<{ scans: number; candidates: number; unchanged: number; edited: number; removed: number; empty: number }>(
        `SELECT COUNT(*) AS scans, COALESCE(SUM(candidate_count),0) AS candidates, COALESCE(SUM(confirmed_unchanged),0) AS unchanged,
           COALESCE(SUM(confirmed_edited),0) AS edited, COALESCE(SUM(removed),0) AS removed,
           COALESCE(SUM(CASE WHEN status = 'failed' OR (status = 'done' AND candidate_count = 0) THEN 1 ELSE 0 END),0) AS empty
         FROM scans`,
      );
      return r ?? { scans: 0, candidates: 0, unchanged: 0, edited: 0, removed: 0, empty: 0 };
    },
    async markFailed(id: string) {
      await db.runAsync("UPDATE scans SET status = 'failed' WHERE id = ?", [id]);
    },
  };

  return { profiles, medicines, doses, kv, scans };
}

function currentDecision(events: readonly DoseEvent[]): 'taken' | 'skipped' | null {
  let decision: 'taken' | 'skipped' | null = null;
  for (const e of [...events].sort((a, b) => a.recordedAt - b.recordedAt)) {
    if (e.kind === 'taken' || e.kind === 'skipped') decision = e.kind;
    else if (e.kind === 'cleared') decision = null;
  }
  return decision;
}

export type Repositories = ReturnType<typeof createRepositories>;
