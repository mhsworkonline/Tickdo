import { buildHistory, unrecordedMisses } from '@/domain/history';
import { istInstant, MINUTE_MS } from '@/domain/time';
import { makeEvent, makeMedicine } from '@/test-utils/factories';

const at8 = istInstant('2026-10-08', 480);
const at20 = istInstant('2026-10-08', 1200);

describe('unrecordedMisses', () => {
  const med = makeMedicine({ createdAt: istInstant('2026-10-08', 0) });

  it('finds doses past the 60 minute window with no decision', () => {
    expect(unrecordedMisses([med], [], at8 + 60 * MINUTE_MS)).toEqual([{ medicineId: 'med-1', scheduledAt: at8 }]);
    expect(unrecordedMisses([med], [], at8 + 59 * MINUTE_MS)).toEqual([]);
  });

  it('ignores doses already taken, skipped, or recorded as missed', () => {
    const now = at20 + 2 * 60 * MINUTE_MS;
    expect(unrecordedMisses([med], [makeEvent({ kind: 'taken', scheduledAt: at8 })], now)).toEqual([{ medicineId: 'med-1', scheduledAt: at20 }]);
    expect(
      unrecordedMisses(
        [med],
        [makeEvent({ kind: 'skipped', scheduledAt: at8 }), makeEvent({ kind: 'missed', scheduledAt: at20, via: 'system' })],
        now,
      ),
    ).toEqual([]);
  });

  it('never reports doses from before the medicine was added', () => {
    const lateAdd = makeMedicine({ createdAt: at8 + 30 * MINUTE_MS });
    expect(unrecordedMisses([lateAdd], [], at8 + 2 * 60 * MINUTE_MS)).toEqual([]);
  });
});

describe('buildHistory', () => {
  it('groups by IST day newest first, using recorded events only', () => {
    const prevDay = istInstant('2026-10-07', 1200);
    const events = [
      makeEvent({ kind: 'taken', scheduledAt: at8, recordedAt: at8 + 5 * MINUTE_MS, via: 'notification' }),
      makeEvent({ kind: 'missed', scheduledAt: at20, recordedAt: at20 + 61 * MINUTE_MS, via: 'system' }),
      makeEvent({ kind: 'skipped', scheduledAt: prevDay, recordedAt: prevDay + MINUTE_MS }),
      makeEvent({ kind: 'snoozed', scheduledAt: istInstant('2026-10-06', 480), snoozeUntil: 1 }),
    ];
    const h = buildHistory(events, [makeMedicine()]);
    expect(h.map((d) => d.day)).toEqual(['2026-10-08', '2026-10-07']);
    expect(h[0]!.items.map((i) => [i.status, i.via])).toEqual([
      ['taken', 'notification'],
      ['missed', 'system'],
    ]);
    expect(h[0]!.items[0]!.recordedAt).toBe(at8 + 5 * MINUTE_MS);
  });

  it('a dose taken late after being recorded missed shows as taken', () => {
    const events = [
      makeEvent({ kind: 'missed', scheduledAt: at8, recordedAt: at8 + 61 * MINUTE_MS, via: 'system' }),
      makeEvent({ kind: 'taken', scheduledAt: at8, recordedAt: at8 + 90 * MINUTE_MS }),
    ];
    expect(buildHistory(events, [makeMedicine()])[0]!.items[0]).toMatchObject({ status: 'taken', recordedAt: at8 + 90 * MINUTE_MS });
  });

  it('undone decisions fall back to missed if recorded, otherwise disappear', () => {
    const cleared = [makeEvent({ kind: 'taken', scheduledAt: at8, recordedAt: 1 }), makeEvent({ kind: 'cleared', scheduledAt: at8, recordedAt: 2 })];
    expect(buildHistory(cleared, [makeMedicine()])).toEqual([]);
  });

  it('marks as-needed doses', () => {
    const prn = makeMedicine({ id: 'prn', frequency: 'as_needed', times: [] });
    const h = buildHistory([makeEvent({ kind: 'taken', medicineId: 'prn', scheduledAt: at8 })], [prn]);
    expect(h[0]!.items[0]!.asNeeded).toBe(true);
  });
});
