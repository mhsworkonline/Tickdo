import type { MedicineInput } from '@/data/repositories';
import type { DateKey } from '@/domain/time';
import { MEDICINE_FORMS, type MedicineForm } from '@/domain/types';
import { catalogDisplayName } from '@/features/catalog/catalog';
import { slotsForPreset, type MedicineDraft } from '@/features/medicines/draft';
import type { Candidate } from '@/features/scan/parser';

function formFromCatalog(form: string | null): MedicineForm | null {
  const f = (form ?? '').toLowerCase();
  return (MEDICINE_FORMS as readonly string[]).includes(f) ? (f as MedicineForm) : null;
}

/**
 * Pure: the editor's starting state for a scanned item — exactly what was read, nothing more.
 * Reminder times are always left empty for the user to enter; only the quantities written in a
 * dash pattern ("½-0-½") are carried over, in order.
 */
export function candidateToDraft(c: Candidate, startDate: DateKey): MedicineDraft {
  const known = c.frequency.kind === 'known' ? c.frequency : null;
  const preset = known?.preset ?? null;
  let slots = preset ? slotsForPreset(preset, []) : [];
  if (known?.slots && known.slots.length === slots.length) {
    slots = slots.map((s, i) => ({ ...s, quantity: known.slots?.[i]?.quantity ?? 1 }));
  }
  return {
    name: catalogDisplayName(c.match.entry),
    catalogId: c.match.entry.id,
    strength: c.strength?.text ?? '',
    form: c.form ?? formFromCatalog(c.match.entry.form) ?? 'tablet',
    frequency: preset,
    slots,
    unitsOnHand: '',
    startDate,
  };
}

/**
 * Pure: did the user change what the scan read? Times are not compared (scans never provide
 * them). Used only for the accuracy counts ("confirmed as read" vs "edited").
 */
export function wasEdited(initial: MedicineDraft, saved: MedicineInput): boolean {
  const quantities = (q: number[]) => q.join(',');
  return (
    initial.name.trim() !== saved.name ||
    (initial.strength.trim() || null) !== saved.strength ||
    initial.form !== saved.form ||
    initial.frequency !== saved.frequency ||
    quantities(initial.slots.map((s) => s.quantity)) !== quantities(saved.times.map((t) => t.quantity))
  );
}
