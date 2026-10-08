import type { FrequencyPreset } from '@/domain/types';
import { catalogDisplayName, type Catalog } from '@/features/catalog/catalog';
import { distanceRatio } from '@/features/catalog/similarity';
import { parsePrescription, type OcrLineInput } from '@/features/scan/parser';

/**
 * Accuracy study evaluation (release gate for the scan path). Pure.
 *
 * Each case = the OCR lines ML Kit produced on a real prescription + a hand-written "truth"
 * label of what the paper says. Metrics follow the product spec:
 * - drug-name error rate: share of presented candidates whose name is NOT on the paper
 *   (a wrong medicine shown to the user — the most important number)
 * - strength / frequency error rate: among correctly named candidates, values that were read
 *   but disagree with the paper ("unclear"/missing values are not errors; they force manual entry)
 * - needs-edit share: candidates the user would have to edit or remove
 * - nothing-usable share: prescriptions where OCR gave nothing usable
 */
export type TruthItem = { name: string; strength: string | null; frequency: FrequencyPreset | null };
export type StudyCase = { id: string; handwritten: boolean; lines: OcrLineInput[]; truth: TruthItem[] };

export type CaseResult = {
  id: string;
  handwritten: boolean;
  nothingUsable: boolean;
  candidates: number;
  nameErrors: number;
  strengthErrors: number;
  strengthChecked: number;
  frequencyErrors: number;
  frequencyChecked: number;
  needsEdit: number;
  missedItems: number;
  truthItems: number;
};

export type AccuracyReport = {
  prescriptions: number;
  handwritten: number;
  nothingUsableShare: number;
  candidates: number;
  drugNameErrorRate: number;
  strengthErrorRate: number;
  frequencyErrorRate: number;
  needsEditShare: number;
  truthItems: number;
  missedItemShare: number;
  cases: CaseResult[];
};

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, '');

function sameName(a: string, b: string): boolean {
  // Catalogue display names may include the salt in brackets; compare each part.
  const parts = (s: string) => s.toLowerCase().split(/[()]/).map((p) => p.trim()).filter(Boolean);
  return parts(a).some((x) => parts(b).some((y) => distanceRatio(x, y) === 0));
}

export function evaluateCase(c: StudyCase, catalog: Catalog): CaseResult {
  const r = parsePrescription(c.lines, catalog);
  const res: CaseResult = {
    id: c.id,
    handwritten: c.handwritten,
    nothingUsable: r.nothingUsable,
    candidates: r.candidates.length,
    nameErrors: 0,
    strengthErrors: 0,
    strengthChecked: 0,
    frequencyErrors: 0,
    frequencyChecked: 0,
    needsEdit: 0,
    missedItems: 0,
    truthItems: c.truth.length,
  };
  const matchedTruth = new Set<number>();
  for (const cand of r.candidates) {
    const name = catalogDisplayName(cand.match.entry);
    const ti = c.truth.findIndex((t, i) => !matchedTruth.has(i) && sameName(name, t.name));
    if (ti < 0) {
      res.nameErrors++;
      res.needsEdit++;
      continue;
    }
    matchedTruth.add(ti);
    const truth = c.truth[ti] as TruthItem;
    let edit = false;
    if (cand.strength) {
      res.strengthChecked++;
      if (norm(cand.strength.text) !== norm(truth.strength)) {
        res.strengthErrors++;
        edit = true;
      }
    } else if (truth.strength) edit = true;
    if (cand.frequency.kind === 'known') {
      res.frequencyChecked++;
      if (cand.frequency.preset !== truth.frequency) {
        res.frequencyErrors++;
        edit = true;
      }
    } else if (truth.frequency) edit = true;
    if (edit) res.needsEdit++;
  }
  res.missedItems = c.truth.length - matchedTruth.size;
  return res;
}

const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function evaluate(cases: readonly StudyCase[], catalog: Catalog): AccuracyReport {
  const results = cases.map((c) => evaluateCase(c, catalog));
  const sum = (k: keyof CaseResult) => results.reduce((s, r) => s + (r[k] as number), 0);
  return {
    prescriptions: results.length,
    handwritten: results.filter((r) => r.handwritten).length,
    nothingUsableShare: ratio(results.filter((r) => r.nothingUsable).length, results.length),
    candidates: sum('candidates'),
    drugNameErrorRate: ratio(sum('nameErrors'), sum('candidates')),
    strengthErrorRate: ratio(sum('strengthErrors'), sum('strengthChecked')),
    frequencyErrorRate: ratio(sum('frequencyErrors'), sum('frequencyChecked')),
    needsEditShare: ratio(sum('needsEdit'), sum('candidates')),
    truthItems: sum('truthItems'),
    missedItemShare: ratio(sum('missedItems'), sum('truthItems')),
    cases: results,
  };
}
