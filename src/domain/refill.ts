import type { Medicine } from '@/domain/types';

/** Alert when fewer than this many days of supply remain. */
export const REFILL_ALERT_DAYS = 3;

/** Units used per day according to the user's own schedule. 0 for as-needed. */
export function dailyUnits(med: Pick<Medicine, 'frequency' | 'times'>): number {
  if (med.frequency === 'as_needed') return 0;
  return med.times.reduce((sum, t) => sum + t.quantity, 0);
}

/**
 * Whole days of supply left. null when not tracking (no stock entered) or as-needed
 * (no daily usage, so days cannot be computed).
 */
export function daysRemaining(med: Pick<Medicine, 'frequency' | 'times' | 'unitsOnHand'>): number | null {
  if (med.unitsOnHand === null) return null;
  const perDay = dailyUnits(med);
  if (perDay <= 0) return null;
  return Math.floor(Math.max(0, med.unitsOnHand) / perDay);
}

export function needsRefill(med: Pick<Medicine, 'frequency' | 'times' | 'unitsOnHand' | 'active'>): boolean {
  if (!med.active) return false;
  const days = daysRemaining(med);
  return days !== null && days < REFILL_ALERT_DAYS;
}

/** Stock after a taken dose (never below 0) or after undoing one. */
export function adjustStock(unitsOnHand: number | null, delta: number): number | null {
  if (unitsOnHand === null) return null;
  return Math.max(0, Math.round((unitsOnHand + delta) * 1000) / 1000);
}
