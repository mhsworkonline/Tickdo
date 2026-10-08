import { MINUTE_MS } from '@/domain/time';
import type { Dose, DoseEvent, DoseStatus } from '@/domain/types';

/** A dose with no taken/skipped record this long after its time counts as missed. */
export const OVERDUE_MINUTES = 60;
export const SNOOZE_MINUTES = 10;

export type ResolvedDose = Dose & {
  status: DoseStatus;
  /** When the deciding taken/skipped action was recorded. */
  recordedAt: number | null;
  snoozeUntil: number | null;
};

/**
 * Status of one dose given the events recorded for it (any order).
 * The latest taken/skipped/cleared event wins; snoozes only matter while no decision exists.
 */
export function doseStatus(dose: Dose, events: readonly DoseEvent[], now: number): ResolvedDose {
  const mine = events
    .filter((e) => e.medicineId === dose.medicineId && e.scheduledAt === dose.scheduledAt)
    .sort((a, b) => a.recordedAt - b.recordedAt);

  let decision: DoseEvent | null = null;
  let snoozeUntil: number | null = null;
  for (const e of mine) {
    if (e.kind === 'taken' || e.kind === 'skipped') decision = e;
    else if (e.kind === 'cleared') decision = null;
    else if (e.kind === 'snoozed') snoozeUntil = e.snoozeUntil;
  }

  if (decision) {
    return { ...dose, status: decision.kind === 'taken' ? 'taken' : 'skipped', recordedAt: decision.recordedAt, snoozeUntil: null };
  }
  const base = { ...dose, recordedAt: null, snoozeUntil };
  if (now >= dose.scheduledAt + OVERDUE_MINUTES * MINUTE_MS) return { ...base, status: 'missed' };
  if (snoozeUntil !== null && now < snoozeUntil) return { ...base, status: 'snoozed' };
  if (now >= dose.scheduledAt) return { ...base, status: 'due' };
  return { ...base, status: 'upcoming' };
}

export function resolveDoses(doses: readonly Dose[], events: readonly DoseEvent[], now: number): ResolvedDose[] {
  return doses.map((d) => doseStatus(d, events, now));
}

export type DaySummary = { total: number; taken: number; skipped: number; missed: number; pending: number };

export function summarise(doses: readonly ResolvedDose[]): DaySummary {
  const s: DaySummary = { total: doses.length, taken: 0, skipped: 0, missed: 0, pending: 0 };
  for (const d of doses) {
    if (d.status === 'taken') s.taken++;
    else if (d.status === 'skipped') s.skipped++;
    else if (d.status === 'missed') s.missed++;
    else s.pending++;
  }
  return s;
}
