import { createCatalog } from '@/features/catalog/catalog';
import { groupRows, parsePrescription, parseStrength } from '@/features/scan/parser';

import { FIXTURE_CATALOG } from './fixtures/catalog';
import { DEVANAGARI, EMPTY, HANDWRITTEN_STYLE, NOISE, PRINTED, SPLIT_ROW, UNCLEAR } from './fixtures/ocr-samples';

const catalog = createCatalog(FIXTURE_CATALOG);
const byName = (r: ReturnType<typeof parsePrescription>) =>
  Object.fromEntries(r.candidates.map((c) => [c.match.entry.salt, c]));

describe('parseStrength', () => {
  it.each([
    ['500mg', '500 mg'],
    ['500 MG', '500 mg'],
    ['250 mg/5 ml', '250 mg/5 ml'],
    ['5mg/5ml', '5 mg/5 ml'],
    ['0.5 mg', '0.5 mg'],
    ['100 mcg', '100 mcg'],
    ['60000 IU', '60000 IU'],
    ['1 gm', '1 g'],
    ['2%', '2 %'],
  ])('%s → %s', (input, out) => {
    expect(parseStrength(`Tab X ${input} OD`)?.text).toBe(out);
  });

  it('does not correct OCR letter/digit confusion', () => {
    expect(parseStrength('Tab X 5OO mg')).toBeNull();
    expect(parseStrength('Tab X l0 mg')).toBeNull();
  });

  it('no unit → no strength', () => {
    expect(parseStrength('Tab Pantoprazole 40 BDS')).toBeNull();
  });
});

describe('parsePrescription: printed prescription', () => {
  const r = parsePrescription(PRINTED, catalog);
  const c = byName(r);

  it('finds exactly the four medicines', () => {
    expect(r.candidates.map((x) => x.match.entry.salt)).toEqual(['Paracetamol', 'Amoxicillin', 'Cetirizine', 'Pantoprazole']);
  });

  it('reads strength, form and frequency from the rules', () => {
    expect(c.Paracetamol).toMatchObject({ form: 'tablet', strength: { text: '500 mg' }, frequency: { kind: 'known', preset: 'twice_daily' } });
    expect(c.Amoxicillin).toMatchObject({ form: 'capsule', strength: { text: '500 mg' }, frequency: { preset: 'three_times_daily' } });
    expect(c.Cetirizine).toMatchObject({ form: 'syrup', strength: { text: '5 mg/5 ml' }, frequency: { preset: 'bedtime' } });
    expect(c.Pantoprazole).toMatchObject({ strength: { text: '40 mg' }, frequency: { preset: 'once_daily' } });
  });

  it('keeps the raw source text for every candidate', () => {
    expect(c.Paracetamol?.sourceText).toBe('1. Tab. Paracetamol 500mg 1-0-1 x 5 days');
  });

  it('lists every other line as not recognised, including headers', () => {
    expect(r.unrecognised).toEqual([
      'Dr. R. K. Sharma MBBS, MD',
      'City Clinic, MG Road, Pune Ph 98-111-2222',
      'Date: 12-10-2026',
      'Rx',
      'Review after 1 week',
    ]);
  });
});

describe('parsePrescription: misspellings (handwritten style)', () => {
  const r = parsePrescription(HANDWRITTEN_STYLE, catalog);
  const c = byName(r);

  it('fuzzy-matches close misspellings to the list entry', () => {
    expect(Object.keys(c).sort()).toEqual(['Amoxicillin', 'Azithromycin', 'Metformin', 'Paracetamol']);
  });

  it('match scores are recorded and within the threshold', () => {
    for (const cand of r.candidates) expect(cand.match.score).toBeLessThanOrEqual(0.2);
  });

  it('a strength with no unit is left empty, not guessed', () => {
    expect(c.Paracetamol?.strength).toBeNull();
  });

  it('a frequency on the next row is attached, and both rows are kept as source text', () => {
    expect(c.Metformin).toMatchObject({
      sourceText: 'Tab Metfromin 500mg\n1 - 0 - 1 after food',
      frequency: { kind: 'known', preset: 'twice_daily' },
    });
  });
});

describe('parsePrescription: unclear items are never guessed', () => {
  const r = parsePrescription(UNCLEAR, catalog);
  const c = byName(r);

  it('abbreviations outside the table are unclear', () => {
    expect(c.Pantoprazole?.frequency).toEqual({ kind: 'unclear', token: null });
    expect(c.Telmisartan?.frequency.kind).toBe('unclear');
  });

  it('conflicting frequency signals are unclear', () => {
    expect(c.Amlodipine?.frequency.kind).toBe('unclear');
  });

  it('OCR-damaged strength stays empty but the known frequency is read', () => {
    expect(c.Ibuprofen).toMatchObject({ strength: null, frequency: { preset: 'as_needed' } });
  });

  it('names not in the list are not recognised', () => {
    expect(r.unrecognised).toEqual(['Tab Xyzzolin 10mg OD']);
  });
});

describe('row grouping', () => {
  it('joins pieces on the same printed row, left to right', () => {
    expect(groupRows(SPLIT_ROW)).toEqual(['Tab Atorvastatin 10 mg 0-0-1', 'Tab Domperidone 10mg 1-1-1']);
  });

  it('parses grouped rows', () => {
    const c = byName(parsePrescription(SPLIT_ROW, catalog));
    expect(c.Atorvastatin).toMatchObject({ strength: { text: '10 mg' }, frequency: { preset: 'once_daily' } });
    expect(c.Domperidone).toMatchObject({ frequency: { preset: 'three_times_daily' } });
  });
});

describe('other scripts and empty results', () => {
  it('Devanagari lines are shown as not recognised (Hindi instructions are not parsed)', () => {
    const r = parsePrescription(DEVANAGARI, catalog);
    expect(r.candidates.map((x) => x.match.entry.salt)).toEqual(['Ondansetron']);
    expect(r.unrecognised).toEqual(['उल्टी होने पर एक गोली', 'भोजन के बाद']);
  });

  it('nothing usable when OCR returns nothing or only noise', () => {
    expect(parsePrescription(EMPTY, catalog).nothingUsable).toBe(true);
    expect(parsePrescription(NOISE, catalog).nothingUsable).toBe(true);
  });

  it('an empty catalogue recognises nothing, so everything goes to manual entry', () => {
    const r = parsePrescription(PRINTED, createCatalog([]));
    expect(r.candidates).toEqual([]);
    expect(r.unrecognised).toHaveLength(PRINTED.length);
  });
});

describe('safety: partial names never match', () => {
  it('truncated or prefix-only names are not recognised', () => {
    const lines = ['Tab Amlo 5mg OD', 'Tab Telma 40 OD', 'Tab Para 500 SOS'].map((text, i) => ({
      text,
      left: 40,
      top: 60 * (i + 1),
      width: 300,
      height: 40,
    }));
    const r = parsePrescription(lines, catalog);
    expect(r.candidates).toEqual([]);
    expect(r.unrecognised).toHaveLength(3);
  });
});
