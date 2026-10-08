/**
 * Time handling for Asia/Kolkata (IST).
 *
 * IST is a fixed UTC+05:30 offset with no daylight saving (none since 1945), so we use
 * plain offset arithmetic instead of relying on the JS engine's time-zone database,
 * which is incomplete on some Android builds of Hermes.
 *
 * - An "instant" is epoch milliseconds (UTC).
 * - A DateKey is an IST calendar date 'YYYY-MM-DD'.
 * - A time of day is minutes after IST midnight, 0..1439.
 */

export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;
export const MINUTES_PER_DAY = 24 * 60;

export type DateKey = string;

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateKey(key: DateKey): [number, number, number] {
  const m = DATE_KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid date key: ${key}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** IST calendar date of an instant. */
export function istDateKey(instant: number): DateKey {
  return new Date(instant + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes after IST midnight of an instant. */
export function istMinutesOfDay(instant: number): number {
  const d = new Date(instant + IST_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** The instant at which `minutes` after IST midnight occurs on `key`. */
export function istInstant(key: DateKey, minutes: number): number {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= MINUTES_PER_DAY) {
    throw new Error(`Invalid minutes of day: ${minutes}`);
  }
  const [y, m, d] = parseDateKey(key);
  return Date.UTC(y, m - 1, d, 0, minutes) - IST_OFFSET_MS;
}

/** Start (inclusive) and end (exclusive) instants of an IST day. */
export function istDayRange(key: DateKey): { start: number; end: number } {
  const start = istInstant(key, 0);
  return { start, end: istInstant(addDays(key, 1), 0) };
}

export function addDays(key: DateKey, days: number): DateKey {
  const [y, m, d] = parseDateKey(key);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Inclusive list of IST dates from `from` to `to`. */
export function dateKeysBetween(from: DateKey, to: DateKey): DateKey[] {
  const keys: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) keys.push(k);
  return keys;
}

export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 12-hour display, e.g. "8:05 AM". */
export function format12h(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function parseHHMM(value: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
