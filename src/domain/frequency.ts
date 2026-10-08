import type { DoseTime, FrequencyPreset } from '@/domain/types';

/**
 * Frequency presets and the fixed prescription-abbreviation lookup table.
 *
 * Nothing here chooses clock times: presets only fix HOW MANY reminder times the user
 * must enter. The user always enters the times themselves.
 */

/** Number of reminder times each preset requires. `null` = any number ≥ 1 (custom). */
export const PRESET_TIME_COUNT: Record<FrequencyPreset, number | null> = {
  once_daily: 1,
  twice_daily: 2,
  three_times_daily: 3,
  four_times_daily: 4,
  bedtime: 1,
  custom: null,
  as_needed: 0,
};

export type TimesValidation =
  | { ok: true }
  | { ok: false; reason: 'wrong_count' | 'duplicate_time' | 'invalid_time' | 'invalid_quantity' };

export function validateTimes(preset: FrequencyPreset, times: readonly DoseTime[]): TimesValidation {
  const expected = PRESET_TIME_COUNT[preset];
  if (expected === null ? times.length < 1 : times.length !== expected) {
    return { ok: false, reason: 'wrong_count' };
  }
  for (const t of times) {
    if (!Number.isInteger(t.minutes) || t.minutes < 0 || t.minutes > 1439) return { ok: false, reason: 'invalid_time' };
    if (!(t.quantity > 0) || !Number.isFinite(t.quantity)) return { ok: false, reason: 'invalid_quantity' };
  }
  if (new Set(times.map((t) => t.minutes)).size !== times.length) return { ok: false, reason: 'duplicate_time' };
  return { ok: true };
}

/** Day slots used by "1-0-1" style patterns. Three-part = morning/afternoon/night; four-part adds evening. */
export type DaySlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'bedtime';

export type FrequencyInterpretation =
  | {
      kind: 'known';
      preset: FrequencyPreset;
      /** The exact token from the prescription that produced this. */
      token: string;
      /** For dash patterns: which slots and how many units at each, as written. */
      slots: { slot: DaySlot; quantity: number }[] | null;
    }
  | { kind: 'unclear'; token: string | null };

/** The fixed abbreviation table from the product spec. Do not add entries without sign-off. */
const ABBREVIATIONS: Record<string, FrequencyPreset> = {
  OD: 'once_daily',
  BD: 'twice_daily',
  TDS: 'three_times_daily',
  QID: 'four_times_daily',
  HS: 'bedtime',
  SOS: 'as_needed',
  PRN: 'as_needed',
};

const PRESET_FOR_COUNT: Record<number, FrequencyPreset> = {
  1: 'once_daily',
  2: 'twice_daily',
  3: 'three_times_daily',
  4: 'four_times_daily',
};

const THREE_SLOTS: DaySlot[] = ['morning', 'afternoon', 'night'];
const FOUR_SLOTS: DaySlot[] = ['morning', 'afternoon', 'evening', 'night'];

// "1-0-1", "1 - 0 - 1", "½-0-½", "1/2-0-1/2", "1-1-1-1". Separators: - – —
// Quantities are single digits (optionally .5 style decimals or simple fractions), which keeps
// dates ("12-10-2026") and phone numbers from being read as dose patterns.
const QTY = String.raw`(?:\d(?:\.\d)?|½|\d\/\d)`;
const SEP = String.raw`\s*[-–—]\s*`;
const DASH_PATTERN = new RegExp(String.raw`(?<![\w.\/])(${QTY})${SEP}(${QTY})${SEP}(${QTY})(?:${SEP}(${QTY}))?(?![\w.\/])`);

function parseQuantity(raw: string): number | null {
  if (raw === '½') return 0.5;
  const frac = /^(\d)\/(\d)$/.exec(raw);
  if (frac) {
    const den = Number(frac[2]);
    return den === 0 ? null : Number(frac[1]) / den;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Whole words that could be abbreviations, normalised: "b.d." → "BD", "T.D.S" → "TDS".
 * Runs of single letters ("T D S", "b. d.") are also joined into one candidate.
 */
function abbreviationCandidates(text: string): { raw: string; normalised: string }[] {
  const words = text
    .split(/[\s,;:()]+/)
    .filter(Boolean)
    .map((raw) => ({ raw, normalised: raw.toUpperCase().replace(/\./g, '') }))
    .filter((w) => /^[A-Z]+$/.test(w.normalised));
  const out = words.filter((w) => w.normalised.length > 1);
  let run: typeof words = [];
  const flush = () => {
    if (run.length > 1) out.push({ raw: run.map((w) => w.raw).join(' '), normalised: run.map((w) => w.normalised).join('') });
    run = [];
  };
  for (const w of text.split(/[\s,;:()]+/).filter(Boolean)) {
    const n = w.toUpperCase().replace(/\./g, '');
    if (/^[A-Z]$/.test(n)) run.push({ raw: w, normalised: n });
    else flush();
  }
  flush();
  return out;
}

/**
 * Interpret the frequency in one line of prescription text. Returns `unclear` whenever the
 * text is not covered by the fixed table or a well-formed dash pattern; never guesses.
 * If a line contains more than one distinct frequency signal, that is also `unclear`.
 */
export function interpretFrequency(text: string): FrequencyInterpretation {
  const found: FrequencyInterpretation[] = [];

  const dash = DASH_PATTERN.exec(text);
  if (dash) {
    const parts = dash.slice(1, 5).filter((p): p is string => p !== undefined);
    const qty = parts.map(parseQuantity);
    if (qty.some((q) => q === null)) return { kind: 'unclear', token: dash[0] };
    const quantities = qty as number[];
    const names = parts.length === 4 ? FOUR_SLOTS : THREE_SLOTS;
    const slots = quantities
      .map((quantity, i) => ({ slot: names[i] as DaySlot, quantity }))
      .filter((s) => s.quantity > 0);
    const preset = PRESET_FOR_COUNT[slots.length];
    if (!preset) return { kind: 'unclear', token: dash[0] };
    found.push({ kind: 'known', preset, token: dash[0].trim(), slots });
  }

  for (const { raw, normalised } of abbreviationCandidates(text)) {
    const preset = ABBREVIATIONS[normalised];
    if (preset) found.push({ kind: 'known', preset, token: raw, slots: null });
  }

  if (found.length === 0) return { kind: 'unclear', token: null };
  const presets = new Set(found.map((f) => (f.kind === 'known' ? f.preset : null)));
  if (presets.size > 1) {
    return { kind: 'unclear', token: found.map((f) => f.token).join(' / ') };
  }
  // Same preset stated twice (e.g. "BD 1-0-1") is consistent; prefer the dash pattern for its slots.
  return found.find((f) => f.kind === 'known' && f.slots !== null) ?? (found[0] as FrequencyInterpretation);
}
