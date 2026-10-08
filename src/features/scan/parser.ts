import { interpretFrequency, type FrequencyInterpretation } from '@/domain/frequency';
import type { MedicineForm } from '@/domain/types';
import type { Catalog, CatalogMatch } from '@/features/catalog/catalog';

/**
 * Deterministic prescription parser. No AI, no guessing:
 * - a line becomes a candidate only if its name fuzzy-matches the local medicine list with a
 *   score at or below MATCH_THRESHOLD; everything else is "not recognised" with its raw text
 * - strength comes only from an explicit "<number> <unit>" in the text (OCR mistakes such as
 *   "5OO mg" are NOT corrected; they simply produce no strength)
 * - frequency comes only from the fixed abbreviation table or a well-formed dash pattern
 */

/**
 * Largest share of a name's letters that may differ (edit distance / length) for an OCR line
 * to count as that medicine. 0.2 accepts "Paracetmol" and "Metfromin" but not "Amlo".
 * Change only on the basis of accuracy-study data (docs/accuracy-report.md).
 */
export const MATCH_THRESHOLD = 0.2;

export type OcrLineInput = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Strength = { text: string };

export type Candidate = {
  /** Stable within one scan. */
  id: string;
  /** Exactly what OCR read (row + any continuation rows), shown next to the interpretation. */
  sourceText: string;
  match: CatalogMatch;
  strength: Strength | null;
  form: MedicineForm | null;
  frequency: FrequencyInterpretation;
};

export type ParseResult = {
  candidates: Candidate[];
  unrecognised: string[];
  /** True when OCR produced nothing that looks like text worth reading. */
  nothingUsable: boolean;
};

const FORM_PREFIXES: [RegExp, MedicineForm][] = [
  [/^(tab|tabs|tablet|t)\b\.?/i, 'tablet'],
  [/^(cap|caps|capsule|c)\b\.?/i, 'capsule'],
  [/^(syp|syr|syrup|susp|suspension)\b\.?/i, 'syrup'],
  [/^(inj|injection)\b\.?/i, 'injection'],
  [/^(oint|ointment|cream|gel|lotion)\b\.?/i, 'cream'],
  [/^(drops?|gtt|e\/d|eye\s*drops?)\b\.?/i, 'drops'],
  [/^(inh|inhaler|rotacap|puff)\b\.?/i, 'inhaler'],
];

const STRENGTH_RE =
  /(?<![A-Za-z0-9.])(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|gm|ml|iu|%)(?![a-z])(?:\s*\/\s*(\d+(?:\.\d+)?)\s*(ml|g|gm|tab)(?![a-z]))?/i;

const UNIT_NORMAL: Record<string, string> = { gm: 'g', 'µg': 'mcg' };

export function parseStrength(text: string): Strength | null {
  const m = STRENGTH_RE.exec(text);
  if (!m) return null;
  const unit = (u: string) => UNIT_NORMAL[u.toLowerCase()] ?? u.toLowerCase();
  const first = `${m[1]} ${unit(m[2] as string)}`.replace(' iu', ' IU');
  return { text: m[3] && m[4] ? `${first}/${m[3]} ${unit(m[4])}` : first };
}

function detectForm(text: string): { form: MedicineForm | null; rest: string } {
  const t = text.replace(/^\s*(\d+[.)]|rx|℞|-|•)\s*/i, '').trim();
  for (const [re, form] of FORM_PREFIXES) {
    const m = re.exec(t);
    if (m) return { form, rest: t.slice(m[0].length).trim() };
  }
  return { form: null, rest: t };
}

/** Removes everything that is not part of the name: strengths, dose patterns, durations, notes. */
function nameCandidates(rest: string): string[] {
  const stripped = rest
    .replace(STRENGTH_RE, ' ')
    .replace(/\b\d+\s*(x|×)?\s*\d*\s*(days?|d|weeks?|wks?|months?)\b/gi, ' ')
    .replace(/[(\[].*?[)\]]/g, ' ')
    .split(/\s+(?=\d)|[-–—]\s*\d|\b\d/)[0] ?? '';
  const words = stripped
    .replace(/[^A-Za-z\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const out: string[] = [];
  for (let n = Math.min(3, words.length); n >= 1; n--) out.push(words.slice(0, n).join(' '));
  return out;
}

function bestCatalogMatch(rest: string, catalog: Catalog): CatalogMatch | null {
  let best: CatalogMatch | null = null;
  const strength = parseStrength(rest)?.text ?? null;
  for (const q of nameCandidates(rest)) {
    const m = catalog.matchName(q, MATCH_THRESHOLD, strength);
    if (m && (!best || m.score < best.score)) best = m;
  }
  return best;
}

/** Joins OCR lines that sit on the same printed row (left to right). */
export function groupRows(lines: readonly OcrLineInput[]): string[] {
  const sorted = lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text.length > 0)
    .sort((a, b) => a.top + a.height / 2 - (b.top + b.height / 2));
  const rows: (OcrLineInput & { cy: number })[][] = [];
  for (const l of sorted) {
    const cy = l.top + l.height / 2;
    const row = rows[rows.length - 1];
    const ref = row?.[0];
    if (row && ref && Math.abs(cy - ref.cy) <= Math.max(ref.height, l.height) * 0.5) row.push({ ...l, cy });
    else rows.push([{ ...l, cy }]);
  }
  return rows.map((r) =>
    r
      .sort((a, b) => a.left - b.left)
      .map((l) => l.text)
      .join(' '),
  );
}

const MIN_USABLE_CHARS = 6;

export function parsePrescription(lines: readonly OcrLineInput[], catalog: Catalog): ParseResult {
  const rows = groupRows(lines);
  const letters = rows.join('').replace(/[^A-Za-zऀ-ॿ]/g, '').length;
  if (letters < MIN_USABLE_CHARS) return { candidates: [], unrecognised: rows, nothingUsable: true };

  const candidates: Candidate[] = [];
  const unrecognised: string[] = [];

  rows.forEach((row) => {
    const { form, rest } = detectForm(row);
    const match = bestCatalogMatch(rest, catalog);
    if (match) {
      candidates.push({
        id: `c${candidates.length + 1}`,
        sourceText: row,
        match,
        strength: parseStrength(rest),
        form,
        frequency: interpretFrequency(rest),
      });
      return;
    }
    // A row with no medicine name directly under a candidate whose frequency is still unclear,
    // and which itself states a frequency (e.g. "1-0-1 after food"), continues that candidate.
    const prev = candidates[candidates.length - 1];
    const freq = interpretFrequency(row);
    if (prev && prev.frequency.kind === 'unclear' && prev.frequency.token === null && freq.kind === 'known' && isPreviousRow(rows, row, prev)) {
      prev.sourceText = `${prev.sourceText}\n${row}`;
      prev.frequency = freq;
      if (!prev.strength) prev.strength = parseStrength(row);
      return;
    }
    unrecognised.push(row);
  });

  return { candidates, unrecognised, nothingUsable: false };
}

function isPreviousRow(rows: readonly string[], row: string, prev: Candidate): boolean {
  const i = rows.indexOf(row);
  const lastLine = prev.sourceText.split('\n').pop();
  return i > 0 && rows[i - 1] === lastLine;
}
