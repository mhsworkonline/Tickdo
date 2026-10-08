import type { DateKey } from '@/domain/time';

export const FREQUENCY_PRESETS = [
  'once_daily',
  'twice_daily',
  'three_times_daily',
  'four_times_daily',
  'bedtime',
  'custom',
  'as_needed',
] as const;
export type FrequencyPreset = (typeof FREQUENCY_PRESETS)[number];

export const MEDICINE_FORMS = ['tablet', 'capsule', 'syrup', 'drops', 'injection', 'cream', 'inhaler', 'other'] as const;
export type MedicineForm = (typeof MEDICINE_FORMS)[number];

export type MedicineSource = 'manual' | 'scan';

/** One reminder time: minutes after IST midnight, and how many units the user said to take. */
export type DoseTime = { minutes: number; quantity: number };

export type Medicine = {
  id: string;
  profileId: string;
  name: string;
  /** Catalogue row the name was picked from; null when the user typed a name not in the list. */
  catalogId: string | null;
  strength: string | null;
  form: MedicineForm;
  frequency: FrequencyPreset;
  times: DoseTime[];
  /** Units (tablets, ml…) the user says they have. null = not tracking refills. */
  unitsOnHand: number | null;
  active: boolean;
  /** When reminders were stopped; null while active. */
  stoppedAt: number | null;
  startDate: DateKey;
  source: MedicineSource;
  scanId: string | null;
  scanSourceText: string | null;
  scanConfirmedAt: number | null;
  color: number;
  createdAt: number;
  updatedAt: number;
};

/** A scheduled occurrence of a medicine. Not stored; derived from medicines. */
export type Dose = {
  key: string;
  medicineId: string;
  scheduledAt: number;
  quantity: number;
};

export const DOSE_EVENT_KINDS = ['taken', 'skipped', 'snoozed', 'cleared', 'missed'] as const;
export type DoseEventKind = (typeof DOSE_EVENT_KINDS)[number];
/** `system` = written by Tickdo itself (a dose passed its 60-minute window unrecorded). */
export type DoseEventVia = 'app' | 'notification' | 'system';

/**
 * Append-only dose log. `cleared` undoes a previous taken/skipped. `missed` is written once
 * when a dose passes its window with no decision, so history never depends on later edits.
 */
export type DoseEvent = {
  id: string;
  medicineId: string;
  scheduledAt: number;
  kind: DoseEventKind;
  recordedAt: number;
  snoozeUntil: number | null;
  via: DoseEventVia;
};

export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'due' | 'snoozed' | 'upcoming';

export function doseKey(medicineId: string, scheduledAt: number): string {
  return `${medicineId}@${scheduledAt}`;
}
