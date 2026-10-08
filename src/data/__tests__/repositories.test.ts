import { LATEST_VERSION, migrate } from '@/data/migrations';
import { createRepositories, type MedicineInput } from '@/data/repositories';
import { createTestDb } from '@/test-utils/sqljs-db';

async function setup() {
  const db = await createTestDb();
  await migrate(db);
  let id = 0;
  let clock = 1_000;
  const repos = createRepositories(db, { newId: () => `id-${++id}`, now: () => ++clock });
  const profileId = await repos.profiles.ensureDefault('Me');
  return { db, repos, profileId };
}

const input: MedicineInput = {
  name: '  Paracetamol ',
  catalogId: 'cat-1',
  strength: '500 mg',
  form: 'tablet',
  frequency: 'twice_daily',
  times: [
    { minutes: 1200, quantity: 1 },
    { minutes: 480, quantity: 1 },
  ],
  unitsOnHand: 10,
  startDate: '2026-10-08',
};

describe('migrations', () => {
  it('applies all migrations and is idempotent', async () => {
    const db = await createTestDb();
    expect(await migrate(db)).toBe(LATEST_VERSION);
    expect(await migrate(db)).toBe(LATEST_VERSION);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(['dose_events', 'kv', 'medicine_times', 'medicines', 'outbox', 'profiles', 'scans']),
    );
  });

  it('enforces scan medicines to carry source text and confirmation time', async () => {
    const { db, profileId } = await setup();
    await expect(
      db.runAsync(
        `INSERT INTO medicines (id, profile_id, name, form, frequency, start_date, source, created_at, updated_at)
         VALUES ('x', ?, 'n', 'tablet', 'once_daily', '2026-01-01', 'scan', 1, 1)`,
        [profileId],
      ),
    ).rejects.toThrow();
  });
});

describe('medicine repository', () => {
  it('creates a manual medicine with trimmed name and sorted times', async () => {
    const { repos, profileId } = await setup();
    const id = await repos.medicines.create(profileId, input);
    const med = await repos.medicines.get(id);
    expect(med).toMatchObject({
      name: 'Paracetamol',
      source: 'manual',
      scanSourceText: null,
      scanConfirmedAt: null,
      times: [
        { minutes: 480, quantity: 1 },
        { minutes: 1200, quantity: 1 },
      ],
    });
  });

  it('scan medicines keep source text and confirmation time, and editing keeps them', async () => {
    const { repos, profileId } = await setup();
    const id = await repos.medicines.create(profileId, input, { scanId: null, sourceText: 'Tab Paracetmol 500 1-0-1' });
    const created = await repos.medicines.get(id);
    expect(created).toMatchObject({ source: 'scan', scanSourceText: 'Tab Paracetmol 500 1-0-1' });
    expect(created?.scanConfirmedAt).toEqual(expect.any(Number));

    await repos.medicines.update(id, { ...input, name: 'Paracetamol', strength: '650 mg' });
    const edited = await repos.medicines.get(id);
    expect(edited).toMatchObject({
      strength: '650 mg',
      source: 'scan',
      scanSourceText: 'Tab Paracetmol 500 1-0-1',
      scanConfirmedAt: created?.scanConfirmedAt,
    });
  });

  it('as-needed medicines store no times', async () => {
    const { repos, profileId } = await setup();
    const id = await repos.medicines.create(profileId, { ...input, frequency: 'as_needed' });
    expect((await repos.medicines.get(id))?.times).toEqual([]);
  });

  it('deactivated medicines drop out of the active list and count', async () => {
    const { repos, profileId } = await setup();
    const a = await repos.medicines.create(profileId, input);
    await repos.medicines.create(profileId, input);
    await repos.medicines.setActive(a, false);
    expect(await repos.medicines.countActive(profileId)).toBe(1);
    expect(await repos.medicines.list(profileId)).toHaveLength(1);
    expect(await repos.medicines.list(profileId, { includeInactive: true })).toHaveLength(2);
  });

  it('rejects invalid times at the database level', async () => {
    const { repos, profileId } = await setup();
    await expect(
      repos.medicines.create(profileId, { ...input, times: [{ minutes: 2000, quantity: 1 }] }),
    ).rejects.toThrow();
    // the failed transaction left nothing behind
    expect(await repos.medicines.countActive(profileId)).toBe(0);
  });
});

describe('dose events and stock', () => {
  it('taking a dose subtracts its quantity once; undo adds it back', async () => {
    const { repos, profileId } = await setup();
    const id = await repos.medicines.create(profileId, input);
    const at = 123;
    await repos.doses.record({ medicineId: id, scheduledAt: at, kind: 'taken', via: 'app', quantity: 1 });
    expect((await repos.medicines.get(id))?.unitsOnHand).toBe(9);

    await repos.doses.record({ medicineId: id, scheduledAt: at, kind: 'taken', via: 'notification', quantity: 1 });
    expect((await repos.medicines.get(id))?.unitsOnHand).toBe(9);

    await repos.doses.record({ medicineId: id, scheduledAt: at, kind: 'cleared', via: 'app', quantity: 1 });
    expect((await repos.medicines.get(id))?.unitsOnHand).toBe(10);

    await repos.doses.record({ medicineId: id, scheduledAt: at, kind: 'skipped', via: 'app', quantity: 1 });
    expect((await repos.medicines.get(id))?.unitsOnHand).toBe(10);

    const events = await repos.doses.eventsFor(id, at);
    expect(events.map((e) => e.kind)).toEqual(['taken', 'taken', 'cleared', 'skipped']);
    expect(events.every((e, i, arr) => i === 0 || e.recordedAt > arr[i - 1]!.recordedAt)).toBe(true);
  });

  it('snooze stores the snooze end and does not touch stock', async () => {
    const { repos, profileId } = await setup();
    const id = await repos.medicines.create(profileId, input);
    const e = await repos.doses.record({ medicineId: id, scheduledAt: 5, kind: 'snoozed', via: 'notification', quantity: 1, snoozeUntil: 600_005 });
    expect(e.snoozeUntil).toBe(600_005);
    expect((await repos.medicines.get(id))?.unitsOnHand).toBe(10);
  });

  it('untracked stock stays null', async () => {
    const { repos, profileId } = await setup();
    const id = await repos.medicines.create(profileId, { ...input, unitsOnHand: null });
    await repos.doses.record({ medicineId: id, scheduledAt: 1, kind: 'taken', via: 'app', quantity: 1 });
    expect((await repos.medicines.get(id))?.unitsOnHand).toBeNull();
  });

  it('eventsBetween is half-open on scheduled time', async () => {
    const { repos, profileId } = await setup();
    const id = await repos.medicines.create(profileId, input);
    for (const at of [10, 20, 30]) {
      await repos.doses.record({ medicineId: id, scheduledAt: at, kind: 'skipped', via: 'app', quantity: 1 });
    }
    expect((await repos.doses.eventsBetween(10, 30)).map((e) => e.scheduledAt)).toEqual([10, 20]);
  });
});

describe('kv', () => {
  it('upserts and removes', async () => {
    const { repos } = await setup();
    await repos.kv.set('a', '1');
    await repos.kv.set('a', '2');
    expect(await repos.kv.get('a')).toBe('2');
    await repos.kv.remove('a');
    expect(await repos.kv.get('a')).toBeNull();
  });
});
