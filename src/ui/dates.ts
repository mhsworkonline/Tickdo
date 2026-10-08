import type { TFunction } from 'i18next';

import { addDays, istDateKey, type DateKey } from '@/domain/time';

/** Weekday of an IST date key (0 = Sunday). Pure calendar maths, no time zones. */
export function weekday(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Thursday, 8 October" in the current language. */
export function formatLongDate(key: DateKey, t: TFunction): string {
  const [, m, d] = key.split('-').map(Number) as [number, number, number];
  const weekdays = t('dates.weekdays', { returnObjects: true }) as unknown as string[];
  const months = t('dates.months', { returnObjects: true }) as unknown as string[];
  return t('dates.long', { weekday: weekdays[weekday(key)], day: d, month: months[m - 1] });
}

/** "Today", "Yesterday" or the long date. */
export function formatDayHeading(key: DateKey, t: TFunction, now = Date.now()): string {
  const today = istDateKey(now);
  if (key === today) return t('log.today');
  if (key === addDays(today, -1)) return t('log.yesterday');
  return formatLongDate(key, t);
}

export type Period = 'morning' | 'afternoon' | 'evening' | 'night';

/** Grouping for the Today list only; never used to decide when reminders happen. */
export function periodOf(minutes: number): Period {
  if (minutes >= 4 * 60 && minutes < 12 * 60) return 'morning';
  if (minutes >= 12 * 60 && minutes < 17 * 60) return 'afternoon';
  if (minutes >= 17 * 60 && minutes < 21 * 60) return 'evening';
  return 'night';
}

export function greetingKey(minutes: number): 'morning' | 'afternoon' | 'evening' {
  if (minutes < 12 * 60) return 'morning';
  if (minutes < 17 * 60) return 'afternoon';
  return 'evening';
}
