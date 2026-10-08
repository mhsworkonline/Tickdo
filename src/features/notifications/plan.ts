import { doseStatus } from '@/domain/dose-status';
import { generateDoses } from '@/domain/schedule';
import { DAY_MS } from '@/domain/time';
import type { Dose, DoseEvent, Medicine } from '@/domain/types';

/** How far ahead reminders are scheduled. Re-planned on app open, on every action and by a background task. */
export const PLAN_HORIZON_MS = 3 * DAY_MS;
/** Android allows ~500 alarms per app; stay well below. */
export const MAX_SCHEDULED = 200;

export type PlannedReminder = {
  identifier: string;
  fireAt: number;
  dose: Dose;
  medicine: Medicine;
  isSnooze: boolean;
};

export function reminderId(dose: Pick<Dose, 'medicineId' | 'scheduledAt'>): string {
  return `dose:${dose.medicineId}:${dose.scheduledAt}`;
}

export function parseReminderId(id: string): { medicineId: string; scheduledAt: number } | null {
  const m = /^dose:(.+):(\d+)$/.exec(id);
  return m ? { medicineId: m[1] as string, scheduledAt: Number(m[2]) } : null;
}

/**
 * Pure: which dose reminders should exist right now.
 * - one reminder per future dose that has not been taken or skipped
 * - a dose snoozed into the future fires at its snooze time instead
 * - nothing for as-needed or stopped medicines
 */
export function planReminders(
  medicines: readonly Medicine[],
  events: readonly DoseEvent[],
  now: number,
  horizon = PLAN_HORIZON_MS,
): PlannedReminder[] {
  const byId = new Map(medicines.map((m) => [m.id, m]));
  // Include the last hour so snoozed doses from just before `now` are considered.
  const doses = generateDoses(medicines, now - DAY_MS, now + horizon);
  const plan: PlannedReminder[] = [];
  for (const dose of doses) {
    const medicine = byId.get(dose.medicineId);
    if (!medicine) continue;
    const r = doseStatus(dose, events, now);
    if (r.status === 'taken' || r.status === 'skipped' || r.status === 'missed') continue;
    if (r.status === 'snoozed' && r.snoozeUntil !== null) {
      plan.push({ identifier: reminderId(dose), fireAt: r.snoozeUntil, dose, medicine, isSnooze: true });
    } else if (dose.scheduledAt > now) {
      plan.push({ identifier: reminderId(dose), fireAt: dose.scheduledAt, dose, medicine, isSnooze: false });
    }
  }
  return plan.sort((a, b) => a.fireAt - b.fireAt).slice(0, MAX_SCHEDULED);
}
