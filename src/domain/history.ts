import { doseStatus, OVERDUE_MINUTES } from '@/domain/dose-status';
import { generateDoses } from '@/domain/schedule';
import { DAY_MS, istDateKey, MINUTE_MS, type DateKey } from '@/domain/time';
import type { DoseEvent, DoseEventVia, Medicine } from '@/domain/types';

/** How far back missed doses are detected and recorded (covers phones left off for a while). */
export const MISS_LOOKBACK_MS = 7 * DAY_MS;

/**
 * Pure: scheduled doses that are past their 60-minute window, have no taken/skipped decision
 * and no `missed` record yet. Only considers the time since each medicine started.
 */
export function unrecordedMisses(
  medicines: readonly Medicine[],
  events: readonly DoseEvent[],
  now: number,
): { medicineId: string; scheduledAt: number }[] {
  const cutoff = now - OVERDUE_MINUTES * MINUTE_MS;
  const doses = generateDoses(medicines, now - MISS_LOOKBACK_MS, cutoff + 1);
  const recorded = new Set(events.filter((e) => e.kind === 'missed').map((e) => `${e.medicineId}@${e.scheduledAt}`));
  const created = new Map(medicines.map((m) => [m.id, m.createdAt]));
  return doses
    .filter((d) => d.scheduledAt >= (created.get(d.medicineId) ?? 0))
    .filter((d) => !recorded.has(`${d.medicineId}@${d.scheduledAt}`))
    .filter((d) => doseStatus(d, events, now).status === 'missed')
    .map((d) => ({ medicineId: d.medicineId, scheduledAt: d.scheduledAt }));
}

export type HistoryItem = {
  medicineId: string;
  scheduledAt: number;
  status: 'taken' | 'skipped' | 'missed';
  /** When the deciding record was made (for missed: when Tickdo recorded it). */
  recordedAt: number;
  via: DoseEventVia;
  /** True when this was an as-needed dose logged by the user, not a scheduled one. */
  asNeeded: boolean;
};

export type HistoryDay = { day: DateKey; items: HistoryItem[] };

/**
 * Pure: the dose log grouped by IST day, newest day first, items by time.
 * Built only from recorded events, so editing a medicine never rewrites the past.
 */
export function buildHistory(events: readonly DoseEvent[], medicines: readonly Medicine[]): HistoryDay[] {
  const asNeededIds = new Set(medicines.filter((m) => m.frequency === 'as_needed').map((m) => m.id));
  const groups = new Map<string, DoseEvent[]>();
  for (const e of events) {
    const key = `${e.medicineId}@${e.scheduledAt}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }

  const items: HistoryItem[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.recordedAt - b.recordedAt);
    let decision: DoseEvent | null = null;
    let missed: DoseEvent | null = null;
    for (const e of sorted) {
      if (e.kind === 'taken' || e.kind === 'skipped') decision = e;
      else if (e.kind === 'cleared') decision = null;
      else if (e.kind === 'missed') missed = e;
    }
    const first = sorted[0] as DoseEvent;
    if (decision) {
      items.push({
        medicineId: first.medicineId,
        scheduledAt: first.scheduledAt,
        status: decision.kind === 'taken' ? 'taken' : 'skipped',
        recordedAt: decision.recordedAt,
        via: decision.via,
        asNeeded: asNeededIds.has(first.medicineId),
      });
    } else if (missed) {
      items.push({
        medicineId: first.medicineId,
        scheduledAt: first.scheduledAt,
        status: 'missed',
        recordedAt: missed.recordedAt,
        via: 'system',
        asNeeded: false,
      });
    }
  }

  const byDay = new Map<DateKey, HistoryItem[]>();
  for (const item of items) {
    const day = istDateKey(item.scheduledAt);
    const list = byDay.get(day) ?? [];
    list.push(item);
    byDay.set(day, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, list]) => ({ day, items: list.sort((a, b) => a.scheduledAt - b.scheduledAt) }));
}
