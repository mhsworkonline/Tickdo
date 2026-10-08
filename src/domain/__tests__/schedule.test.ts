import { dosesForDay, generateDoses } from '@/domain/schedule';
import { istInstant } from '@/domain/time';
import { makeMedicine } from '@/test-utils/factories';

describe('generateDoses', () => {
  it('produces exactly the user-entered times for each IST day', () => {
    const med = makeMedicine();
    const doses = dosesForDay([med], '2026-10-08');
    expect(doses.map((d) => new Date(d.scheduledAt).toISOString())).toEqual([
      '2026-10-08T02:30:00.000Z', // 08:00 IST
      '2026-10-08T14:30:00.000Z', // 20:00 IST
    ]);
    expect(doses.every((d) => d.quantity === 1)).toBe(true);
  });

  it('keeps a 00:15 dose on its IST date across the UTC boundary', () => {
    const med = makeMedicine({ frequency: 'once_daily', times: [{ minutes: 15, quantity: 1 }] });
    const doses = dosesForDay([med], '2026-10-08');
    expect(doses).toHaveLength(1);
    // 00:15 IST on Oct 8 is still Oct 7 in UTC.
    expect(new Date(doses[0]!.scheduledAt).toISOString()).toBe('2026-10-07T18:45:00.000Z');
  });

  it('keeps a 23:45 dose on its IST date', () => {
    const med = makeMedicine({ frequency: 'bedtime', times: [{ minutes: 23 * 60 + 45, quantity: 1 }] });
    const doses = dosesForDay([med], '2026-10-08');
    expect(doses).toHaveLength(1);
    expect(new Date(doses[0]!.scheduledAt).toISOString()).toBe('2026-10-08T18:15:00.000Z');
  });

  it('range is half-open and spans midnight correctly', () => {
    const med = makeMedicine({
      frequency: 'custom',
      times: [
        { minutes: 23 * 60 + 59, quantity: 1 },
        { minutes: 0, quantity: 1 },
      ],
    });
    const from = istInstant('2026-10-08', 23 * 60 + 59);
    const to = istInstant('2026-10-09', 0);
    expect(generateDoses([med], from, to).map((d) => d.scheduledAt)).toEqual([from]);
    expect(generateDoses([med], from, to + 1).map((d) => d.scheduledAt)).toEqual([from, to]);
  });

  it('never schedules as-needed or inactive medicines', () => {
    const asNeeded = makeMedicine({ id: 'a', frequency: 'as_needed', times: [] });
    const inactive = makeMedicine({ id: 'b', active: false });
    expect(dosesForDay([asNeeded, inactive], '2026-10-08')).toEqual([]);
  });

  it('does not schedule before the start date', () => {
    const med = makeMedicine({ startDate: '2026-10-09' });
    expect(dosesForDay([med], '2026-10-08')).toEqual([]);
    expect(dosesForDay([med], '2026-10-09')).toHaveLength(2);
  });

  it('multi-day window returns sorted doses for several medicines', () => {
    const a = makeMedicine({ id: 'a', frequency: 'once_daily', times: [{ minutes: 9 * 60, quantity: 1 }] });
    const b = makeMedicine({ id: 'b', frequency: 'once_daily', times: [{ minutes: 7 * 60, quantity: 2 }] });
    const doses = generateDoses([a, b], istInstant('2026-10-08', 0), istInstant('2026-10-11', 0));
    expect(doses).toHaveLength(6);
    expect(doses.map((d) => d.medicineId)).toEqual(['b', 'a', 'b', 'a', 'b', 'a']);
    expect(doses[0]!.quantity).toBe(2);
  });

  it('empty or inverted range gives nothing', () => {
    const t = istInstant('2026-10-08', 0);
    expect(generateDoses([makeMedicine()], t, t)).toEqual([]);
    expect(generateDoses([makeMedicine()], t, t - 1)).toEqual([]);
  });

  it('dose keys are unique and stable', () => {
    const doses = dosesForDay([makeMedicine()], '2026-10-08');
    expect(new Set(doses.map((d) => d.key)).size).toBe(2);
    expect(dosesForDay([makeMedicine()], '2026-10-08').map((d) => d.key)).toEqual(doses.map((d) => d.key));
  });
});
