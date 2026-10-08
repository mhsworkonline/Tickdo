import { istInstant, MINUTE_MS } from '@/domain/time';
import { buildSharedDoses } from '@/features/caregiver/share';
import { makeEvent, makeMedicine } from '@/test-utils/factories';

const now = istInstant('2026-10-08', 20 * 60 + 30); // 20:30 IST

describe('buildSharedDoses', () => {
  const med = makeMedicine({ name: 'Metformin', strength: '500 mg', unitsOnHand: 30 });

  it('shares a ±2 day window with label, time and status only', () => {
    const rows = buildSharedDoses([med], [], now);
    expect(rows).toHaveLength(8); // 2 per day over 4 days
    expect(Object.keys(rows[0]!).sort()).toEqual(['dose_key', 'medicine_label', 'recorded_at', 'scheduled_at', 'status']);
    expect(rows[0]!.medicine_label).toBe('Metformin 500 mg');
  });

  it('maps statuses: taken/skipped/missed are final, everything else pending', () => {
    const at8 = istInstant('2026-10-08', 480);
    const at20 = istInstant('2026-10-08', 1200);
    const rows = buildSharedDoses([med], [makeEvent({ kind: 'taken', scheduledAt: at8, recordedAt: at8 + 5 * MINUTE_MS })], now);
    const byTime = new Map(rows.map((r) => [Date.parse(r.scheduled_at), r]));
    expect(byTime.get(at8)).toMatchObject({ status: 'taken', recorded_at: new Date(at8 + 5 * MINUTE_MS).toISOString() });
    expect(byTime.get(at20)).toMatchObject({ status: 'pending', recorded_at: null }); // 30 min late: not yet missed
    expect(byTime.get(istInstant('2026-10-07', 480))?.status).toBe('missed');
    expect(byTime.get(istInstant('2026-10-09', 480))?.status).toBe('pending');
  });

  it('includes logged as-needed doses as taken', () => {
    const prn = makeMedicine({ id: 'prn', name: 'Ibuprofen', strength: null, frequency: 'as_needed', times: [] });
    const t = now - 30 * MINUTE_MS;
    const rows = buildSharedDoses([prn], [makeEvent({ kind: 'taken', medicineId: 'prn', scheduledAt: t, recordedAt: t })], now);
    expect(rows).toEqual([{ dose_key: `prn@${t}`, medicine_label: 'Ibuprofen', scheduled_at: new Date(t).toISOString(), status: 'taken', recorded_at: new Date(t).toISOString() }]);
  });

  it('stopped medicines are not shared', () => {
    expect(buildSharedDoses([makeMedicine({ active: false })], [], now)).toEqual([]);
  });
});
