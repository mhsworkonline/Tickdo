import { doseStatus, OVERDUE_MINUTES, summarise, resolveDoses } from '@/domain/dose-status';
import { MINUTE_MS } from '@/domain/time';
import type { Dose } from '@/domain/types';
import { makeEvent } from '@/test-utils/factories';

const T = Date.parse('2026-10-08T02:30:00.000Z');
const dose: Dose = { key: 'k', medicineId: 'med-1', scheduledAt: T, quantity: 1 };

describe('doseStatus', () => {
  it('upcoming before, due at the time, missed after 60 minutes', () => {
    expect(doseStatus(dose, [], T - 1).status).toBe('upcoming');
    expect(doseStatus(dose, [], T).status).toBe('due');
    expect(doseStatus(dose, [], T + OVERDUE_MINUTES * MINUTE_MS - 1).status).toBe('due');
    expect(doseStatus(dose, [], T + OVERDUE_MINUTES * MINUTE_MS).status).toBe('missed');
  });

  it('taken records when it was recorded, even if late', () => {
    const late = T + 3 * 60 * MINUTE_MS;
    const r = doseStatus(dose, [makeEvent({ kind: 'taken', scheduledAt: T, recordedAt: late })], late + 1);
    expect(r.status).toBe('taken');
    expect(r.recordedAt).toBe(late);
  });

  it('skipped is final unless cleared', () => {
    const events = [makeEvent({ kind: 'skipped', scheduledAt: T, recordedAt: T + 1 })];
    expect(doseStatus(dose, events, T + 2).status).toBe('skipped');
    events.push(makeEvent({ kind: 'cleared', scheduledAt: T, recordedAt: T + 2 }));
    expect(doseStatus(dose, events, T + 3).status).toBe('due');
  });

  it('latest decision wins regardless of array order', () => {
    const events = [
      makeEvent({ kind: 'taken', scheduledAt: T, recordedAt: T + 20 }),
      makeEvent({ kind: 'skipped', scheduledAt: T, recordedAt: T + 10 }),
    ];
    expect(doseStatus(dose, events, T + 30).status).toBe('taken');
  });

  it('snoozed until snooze ends, then due again, still missed after 60 min', () => {
    const events = [makeEvent({ kind: 'snoozed', scheduledAt: T, recordedAt: T + 1, snoozeUntil: T + 10 * MINUTE_MS })];
    expect(doseStatus(dose, events, T + 5 * MINUTE_MS).status).toBe('snoozed');
    expect(doseStatus(dose, events, T + 10 * MINUTE_MS).status).toBe('due');
    expect(doseStatus(dose, events, T + 61 * MINUTE_MS).status).toBe('missed');
  });

  it('ignores events for other medicines or other dose times', () => {
    const events = [
      makeEvent({ kind: 'taken', scheduledAt: T, medicineId: 'other' }),
      makeEvent({ kind: 'taken', scheduledAt: T + 1 }),
    ];
    expect(doseStatus(dose, events, T).status).toBe('due');
  });

  it('summarise counts each status bucket', () => {
    const doses: Dose[] = [0, 1, 2, 3].map((i) => ({ key: `k${i}`, medicineId: `m${i}`, scheduledAt: T, quantity: 1 }));
    const events = [
      makeEvent({ kind: 'taken', medicineId: 'm0', scheduledAt: T }),
      makeEvent({ kind: 'skipped', medicineId: 'm1', scheduledAt: T }),
    ];
    const resolved = resolveDoses(doses, events, T + 2 * 60 * MINUTE_MS);
    expect(summarise(resolved)).toEqual({ total: 4, taken: 1, skipped: 1, missed: 2, pending: 0 });
  });
});
