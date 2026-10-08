import fs from 'node:fs';
import path from 'node:path';

import { createCatalog, type CatalogEntry } from '@/features/catalog/catalog';
import { evaluate, type StudyCase } from '@/features/scan/accuracy';

import { FIXTURE_CATALOG } from './fixtures/catalog';
import { PRINTED, UNCLEAR } from './fixtures/ocr-samples';

const catalog = createCatalog(FIXTURE_CATALOG);

describe('accuracy evaluation', () => {
  it('computes the spec metrics on labelled samples', () => {
    const cases: StudyCase[] = [
      {
        id: 'printed',
        handwritten: false,
        lines: PRINTED,
        truth: [
          { name: 'Paracetamol', strength: '500 mg', frequency: 'twice_daily' },
          { name: 'Amoxicillin', strength: '500 mg', frequency: 'three_times_daily' },
          { name: 'Cetirizine', strength: '5 mg/5 ml', frequency: 'bedtime' },
          { name: 'Pantoprazole', strength: '40 mg', frequency: 'once_daily' },
        ],
      },
      {
        id: 'unclear',
        handwritten: true,
        lines: UNCLEAR,
        truth: [
          { name: 'Pantoprazole', strength: '40 mg', frequency: 'twice_daily' },
          { name: 'Telmisartan', strength: '40 mg', frequency: 'three_times_daily' },
          { name: 'Amlodipine', strength: '5 mg', frequency: 'twice_daily' },
          { name: 'Ibuprofen', strength: '400 mg', frequency: 'as_needed' },
          { name: 'Xyzzolin', strength: '10 mg', frequency: 'once_daily' },
        ],
      },
      { id: 'blank', handwritten: true, lines: [], truth: [{ name: 'Metformin', strength: '500 mg', frequency: 'twice_daily' }] },
    ];
    const r = evaluate(cases, catalog);
    expect(r).toMatchObject({
      prescriptions: 3,
      handwritten: 2,
      candidates: 8,
      drugNameErrorRate: 0,
      strengthErrorRate: 0,
      frequencyErrorRate: 0,
      truthItems: 10,
    });
    expect(r.nothingUsableShare).toBeCloseTo(1 / 3);
    // printed: all exact; unclear: Pantoprazole (no unit, BDS), Telmisartan (q8h), Amlodipine (conflict), Ibuprofen (4OO) need edits
    expect(r.needsEditShare).toBeCloseTo(4 / 8);
    // Xyzzolin (not in list) and the blank prescription's Metformin are missed
    expect(r.missedItemShare).toBeCloseTo(2 / 10);
  });

  it('counts a wrong medicine as a drug-name error', () => {
    const r = evaluate(
      [{ id: 'x', handwritten: false, lines: [{ text: 'Tab Paracetamol 500mg OD', left: 0, top: 0, width: 400, height: 40 }], truth: [{ name: 'Metformin', strength: '500 mg', frequency: 'once_daily' }] }],
      catalog,
    );
    expect(r.drugNameErrorRate).toBe(1);
    expect(r.missedItemShare).toBe(1);
  });
});

/**
 * Real accuracy study. Runs only when ACCURACY_DATA points at a folder of cases:
 *   <case>/ocr.json   — { "lines": [...] } exported from a study build
 *   <case>/truth.json — { "handwritten": bool, "medicines": [{ name, strength, frequency }] }
 * plus ACCURACY_CATALOG (JSON array of catalogue entries). Writes report.json next to the cases.
 *   ACCURACY_DATA=./accuracy-data ACCURACY_CATALOG=./assets/catalog/medicines.json npx jest accuracy
 */
const dataDir = process.env.ACCURACY_DATA;
(dataDir ? it : it.skip)('accuracy study on real prescriptions', () => {
  const dir = path.resolve(dataDir as string);
  const entries = JSON.parse(fs.readFileSync(path.resolve(process.env.ACCURACY_CATALOG ?? 'assets/catalog/medicines.json'), 'utf8')) as CatalogEntry[];
  const cases: StudyCase[] = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const ocr = JSON.parse(fs.readFileSync(path.join(dir, d.name, 'ocr.json'), 'utf8')) as { lines: StudyCase['lines'] };
      const truth = JSON.parse(fs.readFileSync(path.join(dir, d.name, 'truth.json'), 'utf8')) as {
        handwritten: boolean;
        medicines: StudyCase['truth'];
      };
      return { id: d.name, handwritten: truth.handwritten, lines: ocr.lines, truth: truth.medicines };
    });
  const report = evaluate(cases, createCatalog(entries));
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  console.log(
    [
      `Prescriptions: ${report.prescriptions} (${report.handwritten} handwritten)`,
      `Drug-name error rate: ${pct(report.drugNameErrorRate)} of ${report.candidates} candidates`,
      `Strength error rate: ${pct(report.strengthErrorRate)}`,
      `Frequency error rate: ${pct(report.frequencyErrorRate)}`,
      `Needed edit or removal: ${pct(report.needsEditShare)}`,
      `OCR nothing usable: ${pct(report.nothingUsableShare)}`,
      `Medicines on paper not offered (manual entry): ${pct(report.missedItemShare)}`,
    ].join('\n'),
  );
  expect(report.prescriptions).toBeGreaterThan(0);
});
