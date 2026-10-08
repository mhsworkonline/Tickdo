import { emptyDraft, slotsForPreset, validateDraft, type MedicineDraft } from '@/features/medicines/draft';

const base = (over: Partial<MedicineDraft> = {}): MedicineDraft => ({ ...emptyDraft('2026-10-08'), name: 'Metformin', ...over });

describe('slotsForPreset', () => {
  it('creates empty (unsuggested) rows for the preset count', () => {
    expect(slotsForPreset('three_times_daily', [])).toEqual([
      { minutes: null, quantity: 1 },
      { minutes: null, quantity: 1 },
      { minutes: null, quantity: 1 },
    ]);
  });

  it('keeps times the user already chose when changing preset', () => {
    const current = [
      { minutes: 480, quantity: 2 },
      { minutes: 1200, quantity: 1 },
    ];
    expect(slotsForPreset('once_daily', current)).toEqual([{ minutes: 480, quantity: 2 }]);
    expect(slotsForPreset('three_times_daily', current)).toEqual([...current, { minutes: null, quantity: 1 }]);
  });

  it('as needed has no rows; custom keeps at least one', () => {
    expect(slotsForPreset('as_needed', [{ minutes: 1, quantity: 1 }])).toEqual([]);
    expect(slotsForPreset('custom', [])).toEqual([{ minutes: null, quantity: 1 }]);
  });
});

describe('validateDraft', () => {
  it('requires name, frequency and every time', () => {
    const r = validateDraft({ ...emptyDraft('2026-10-08') });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name?.key).toBe('form.nameRequired');
      expect(r.errors.frequency?.key).toBe('form.frequencyRequired');
    }
    const missing = validateDraft(base({ frequency: 'twice_daily', slots: slotsForPreset('twice_daily', []) }));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.times).toEqual({ key: 'form.timesMissing', count: 2 });
  });

  it('produces exactly what was entered, times sorted', () => {
    const r = validateDraft(
      base({
        strength: ' 500 mg ',
        frequency: 'twice_daily',
        slots: [
          { minutes: 1260, quantity: 1 },
          { minutes: 450, quantity: 0.5 },
        ],
        unitsOnHand: '30',
      }),
    );
    expect(r).toEqual({
      ok: true,
      input: {
        name: 'Metformin',
        catalogId: null,
        strength: '500 mg',
        form: 'tablet',
        frequency: 'twice_daily',
        times: [
          { minutes: 450, quantity: 0.5 },
          { minutes: 1260, quantity: 1 },
        ],
        unitsOnHand: 30,
        startDate: '2026-10-08',
      },
    });
  });

  it('rejects duplicate times and bad stock', () => {
    const dup = validateDraft(base({ frequency: 'twice_daily', slots: [{ minutes: 480, quantity: 1 }, { minutes: 480, quantity: 1 }] }));
    expect(!dup.ok && dup.errors.times?.key).toBe('form.duplicateTime');
    const stock = validateDraft(base({ frequency: 'as_needed', unitsOnHand: 'abc' }));
    expect(!stock.ok && stock.errors.stock?.key).toBe('form.stockInvalid');
  });

  it('as needed saves with no times; empty strength and stock become null', () => {
    const r = validateDraft(base({ frequency: 'as_needed', slots: [{ minutes: 480, quantity: 1 }] }));
    expect(r).toMatchObject({ ok: true, input: { times: [], strength: null, unitsOnHand: null } });
  });

  it('accepts a decimal comma in stock', () => {
    expect(validateDraft(base({ frequency: 'as_needed', unitsOnHand: '12,5' }))).toMatchObject({ ok: true, input: { unitsOnHand: 12.5 } });
  });
});
