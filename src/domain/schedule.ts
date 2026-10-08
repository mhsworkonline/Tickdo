import { addDays, dateKeysBetween, istDateKey, istInstant, type DateKey } from '@/domain/time';
import { doseKey, type Dose, type Medicine } from '@/domain/types';

/**
 * All scheduled doses with `from <= scheduledAt < to`, sorted by time.
 * Exactly the times the user entered; as-needed medicines never produce doses.
 * Days are IST calendar days, so a 00:30 dose belongs to the IST date it falls on.
 */
export function generateDoses(medicines: readonly Medicine[], from: number, to: number): Dose[] {
  if (to <= from) return [];
  // One extra day each side covers any instant range regardless of offset.
  const days = dateKeysBetween(addDays(istDateKey(from), -1), addDays(istDateKey(to), 1));
  const doses: Dose[] = [];
  for (const med of medicines) {
    if (!med.active || med.frequency === 'as_needed') continue;
    for (const day of days) {
      if (day < med.startDate) continue;
      for (const t of med.times) {
        const at = istInstant(day, t.minutes);
        if (at >= from && at < to) {
          doses.push({ key: doseKey(med.id, at), medicineId: med.id, scheduledAt: at, quantity: t.quantity });
        }
      }
    }
  }
  return doses.sort((a, b) => a.scheduledAt - b.scheduledAt || a.medicineId.localeCompare(b.medicineId));
}

export function dosesForDay(medicines: readonly Medicine[], day: DateKey): Dose[] {
  return generateDoses(medicines, istInstant(day, 0), istInstant(addDays(day, 1), 0));
}
