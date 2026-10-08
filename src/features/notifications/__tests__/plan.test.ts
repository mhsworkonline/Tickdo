import { planReminders, parseReminderId, reminderId, MAX_SCHEDULED } from '@/features/notifications/plan';
import { istInstant, MINUTE_MS } from '@/domain/time';
import { makeEvent, makeMedicine } from '@/test-utils/factories';

const now = istInstant('2026-10-08', 9 * 60); // 09:00 IST, after the 08:00 dose

describe('planReminders', () => {
  it('schedules future doses over the 3-day horizon at the exact entered times', () => {
    const plan = planReminders([makeMedicine()], [], now);
    expect(plan.map((p) => p.fireAt)).toEqual([
      istInstant('2026-10-08', 1200),
      istInstant('2026-10-09', 480),
      istInstant('2026-10-09', 1200),
      istInstant('2026-10-10', 480),
      istInstant('2026-10-10', 1200),
      istInstant('2026-10-11', 480),
    ]);
  });

  it('skips doses already taken or skipped', () => {
    const at = istInstant('2026-10-08', 1200);
    const plan = planReminders([makeMedicine()], [makeEvent({ kind: 'taken', scheduledAt: at, recordedAt: now })], now);
    expect(plan.map((p) => p.fireAt)).not.toContain(at);
  });

  it('a snoozed past dose fires at its snooze time', () => {
    const at = istInstant('2026-10-08', 480);
    const t = at + 5 * MINUTE_MS;
    const events = [makeEvent({ kind: 'snoozed', scheduledAt: at, recordedAt: at + MINUTE_MS, snoozeUntil: at + 11 * MINUTE_MS })];
    const plan = planReminders([makeMedicine()], events, t);
    expect(plan[0]).toMatchObject({ fireAt: at + 11 * MINUTE_MS, isSnooze: true, identifier: reminderId({ medicineId: 'med-1', scheduledAt: at }) });
  });

  it('nothing for as-needed or stopped medicines', () => {
    expect(planReminders([makeMedicine({ frequency: 'as_needed', times: [] }), makeMedicine({ id: 'x', active: false })], [], now)).toEqual([]);
  });

  it('caps the number of scheduled reminders', () => {
    const times = Array.from({ length: 100 }, (_, i) => ({ minutes: i * 14, quantity: 1 }));
    const plan = planReminders([makeMedicine({ frequency: 'custom', times })], [], now);
    expect(plan).toHaveLength(MAX_SCHEDULED);
  });

  it('reminder ids round-trip, including ids containing colons', () => {
    expect(parseReminderId(reminderId({ medicineId: 'a:b-c', scheduledAt: 123 }))).toEqual({ medicineId: 'a:b-c', scheduledAt: 123 });
    expect(parseReminderId('other')).toBeNull();
  });
});
