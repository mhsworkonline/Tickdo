import { createCatalog } from '@/features/catalog/catalog';
import { validateDraft } from '@/features/medicines/draft';
import { candidateToDraft, wasEdited } from '@/features/scan/candidate-draft';
import { parsePrescription } from '@/features/scan/parser';

import { FIXTURE_CATALOG } from './fixtures/catalog';

const catalog = createCatalog(FIXTURE_CATALOG);
const parse = (text: string) => parsePrescription([{ text, left: 0, top: 0, width: 500, height: 40 }], catalog).candidates[0]!;

describe('candidateToDraft', () => {
  it('carries over name, strength, form and frequency, but never times', () => {
    const d = candidateToDraft(parse('Tab. Paracetamol 500mg 1-0-1'), '2026-10-08');
    expect(d).toMatchObject({
      name: 'Paracetamol',
      catalogId: 'paracetamol',
      strength: '500 mg',
      form: 'tablet',
      frequency: 'twice_daily',
      slots: [
        { minutes: null, quantity: 1 },
        { minutes: null, quantity: 1 },
      ],
    });
  });

  it('keeps written quantities from dash patterns', () => {
    const d = candidateToDraft(parse('Tab Metformin 500mg ½-0-½'), '2026-10-08');
    expect(d.slots.map((s) => s.quantity)).toEqual([0.5, 0.5]);
  });

  it('unclear frequency leaves frequency empty for the user', () => {
    const d = candidateToDraft(parse('Tab Pantoprazole 40mg BDS'), '2026-10-08');
    expect(d.frequency).toBeNull();
    expect(d.slots).toEqual([]);
  });

  it('a scanned scheduled item cannot be saved until times are entered', () => {
    const d = candidateToDraft(parse('Cap Amoxicillin 500mg TDS'), '2026-10-08');
    expect(validateDraft(d).ok).toBe(false);
  });

  it('a scanned as-needed item with a name is valid as read', () => {
    const d = candidateToDraft(parse('Tab Ibuprofen 400mg SOS'), '2026-10-08');
    expect(validateDraft(d).ok).toBe(true);
  });

  it('falls back to the catalogue form when the line has no prefix', () => {
    expect(candidateToDraft(parse('Salbutamol 100mcg SOS'), '2026-10-08').form).toBe('inhaler');
  });
});

describe('wasEdited', () => {
  const d = candidateToDraft(parse('Tab. Paracetamol 500mg 1-0-1'), '2026-10-08');
  const saved = {
    name: 'Paracetamol',
    catalogId: 'paracetamol',
    strength: '500 mg',
    form: 'tablet' as const,
    frequency: 'twice_daily' as const,
    times: [
      { minutes: 480, quantity: 1 },
      { minutes: 1260, quantity: 1 },
    ],
    unitsOnHand: null,
    startDate: '2026-10-08',
  };

  it('choosing times alone is not an edit', () => {
    expect(wasEdited(d, saved)).toBe(false);
  });

  it('changing strength, frequency or quantity is an edit', () => {
    expect(wasEdited(d, { ...saved, strength: '650 mg' })).toBe(true);
    expect(wasEdited(d, { ...saved, frequency: 'once_daily', times: [{ minutes: 480, quantity: 1 }] })).toBe(true);
    expect(wasEdited(d, { ...saved, times: [{ minutes: 480, quantity: 2 }, { minutes: 1260, quantity: 1 }] })).toBe(true);
  });
});
