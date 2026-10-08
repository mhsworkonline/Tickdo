import type { MedicineInput } from '@/data/repositories';
import { PRESET_TIME_COUNT, validateTimes } from '@/domain/frequency';
import type { DateKey } from '@/domain/time';
import type { FrequencyPreset, Medicine, MedicineForm } from '@/domain/types';

/** One reminder row in the form. `minutes` stays null until the user picks a time — never pre-filled. */
export type TimeSlot = { minutes: number | null; quantity: number };

export type MedicineDraft = {
  name: string;
  catalogId: string | null;
  strength: string;
  form: MedicineForm;
  frequency: FrequencyPreset | null;
  slots: TimeSlot[];
  unitsOnHand: string;
  startDate: DateKey;
};

export type DraftErrors = Partial<Record<'name' | 'frequency' | 'times' | 'stock', string>>;

export function emptyDraft(startDate: DateKey): MedicineDraft {
  return { name: '', catalogId: null, strength: '', form: 'tablet', frequency: null, slots: [], unitsOnHand: '', startDate };
}

export function draftFromMedicine(m: Medicine): MedicineDraft {
  return {
    name: m.name,
    catalogId: m.catalogId,
    strength: m.strength ?? '',
    form: m.form,
    frequency: m.frequency,
    slots: m.times.map((t) => ({ minutes: t.minutes, quantity: t.quantity })),
    unitsOnHand: m.unitsOnHand === null ? '' : String(m.unitsOnHand),
    startDate: m.startDate,
  };
}

/**
 * Resizes the reminder rows to what the preset needs, keeping times the user already chose.
 * New rows start empty (no suggested time) with quantity 1.
 */
export function slotsForPreset(preset: FrequencyPreset, current: readonly TimeSlot[]): TimeSlot[] {
  const count = PRESET_TIME_COUNT[preset];
  if (count === 0) return [];
  const target = count ?? Math.max(1, current.length);
  const next = current.slice(0, target);
  while (next.length < target) next.push({ minutes: null, quantity: 1 });
  return next;
}

export type ErrorKey =
  | 'form.nameRequired'
  | 'form.timesMissing'
  | 'form.duplicateTime'
  | 'form.stockInvalid'
  | 'form.frequencyRequired';

export type DraftResult =
  | { ok: true; input: MedicineInput }
  | { ok: false; errors: Partial<Record<keyof DraftErrors, { key: ErrorKey; count?: number }>> };

/** Pure validation. Produces exactly what the user entered, or the reasons it cannot be saved. */
export function validateDraft(d: MedicineDraft): DraftResult {
  const errors: Partial<Record<keyof DraftErrors, { key: ErrorKey; count?: number }>> = {};
  if (!d.name.trim()) errors.name = { key: 'form.nameRequired' };
  if (!d.frequency) errors.frequency = { key: 'form.frequencyRequired' };

  let times: { minutes: number; quantity: number }[] = [];
  if (d.frequency && d.frequency !== 'as_needed') {
    if (d.slots.length === 0 || d.slots.some((s) => s.minutes === null)) {
      errors.times = { key: 'form.timesMissing', count: d.slots.length || 1 };
    } else {
      times = d.slots.map((s) => ({ minutes: s.minutes as number, quantity: s.quantity }));
      const v = validateTimes(d.frequency, times);
      if (!v.ok) errors.times = { key: v.reason === 'duplicate_time' ? 'form.duplicateTime' : 'form.timesMissing', count: d.slots.length };
    }
  }

  let unitsOnHand: number | null = null;
  const stock = d.unitsOnHand.trim().replace(',', '.');
  if (stock) {
    const n = Number(stock);
    if (!Number.isFinite(n) || n < 0 || n > 100000) errors.stock = { key: 'form.stockInvalid' };
    else unitsOnHand = n;
  }

  if (Object.keys(errors).length > 0 || !d.frequency) return { ok: false, errors };
  return {
    ok: true,
    input: {
      name: d.name.trim(),
      catalogId: d.catalogId,
      strength: d.strength.trim() || null,
      form: d.form,
      frequency: d.frequency,
      times: [...times].sort((a, b) => a.minutes - b.minutes),
      unitsOnHand,
      startDate: d.startDate,
    },
  };
}
