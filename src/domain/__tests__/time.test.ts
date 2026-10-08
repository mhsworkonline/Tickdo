import {
  addDays,
  dateKeysBetween,
  format12h,
  formatHHMM,
  istDateKey,
  istDayRange,
  istInstant,
  istMinutesOfDay,
  parseHHMM,
} from '@/domain/time';

describe('IST time helpers', () => {
  it('IST midnight is 18:30 UTC the previous day', () => {
    expect(new Date(istInstant('2026-10-08', 0)).toISOString()).toBe('2026-10-07T18:30:00.000Z');
  });

  it('date key flips exactly at IST midnight, not UTC midnight', () => {
    expect(istDateKey(Date.parse('2026-10-07T18:29:59.999Z'))).toBe('2026-10-07');
    expect(istDateKey(Date.parse('2026-10-07T18:30:00.000Z'))).toBe('2026-10-08');
    // UTC midnight is 05:30 IST, same IST day
    expect(istDateKey(Date.parse('2026-10-08T00:00:00.000Z'))).toBe('2026-10-08');
  });

  it('minutes of day round-trips through istInstant', () => {
    for (const minutes of [0, 1, 330, 719, 720, 1439]) {
      const at = istInstant('2026-03-01', minutes);
      expect(istMinutesOfDay(at)).toBe(minutes);
      expect(istDateKey(at)).toBe('2026-03-01');
    }
  });

  it('rejects invalid minutes', () => {
    expect(() => istInstant('2026-03-01', 1440)).toThrow();
    expect(() => istInstant('2026-03-01', -1)).toThrow();
    expect(() => istInstant('2026-03-01', 1.5)).toThrow();
  });

  it('day range is 24 hours', () => {
    const { start, end } = istDayRange('2026-12-31');
    expect(end - start).toBe(24 * 60 * 60 * 1000);
  });

  it('addDays crosses month, year and leap day', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('dateKeysBetween is inclusive', () => {
    expect(dateKeysBetween('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('formats and parses times', () => {
    expect(formatHHMM(485)).toBe('08:05');
    expect(format12h(0)).toBe('12:00 AM');
    expect(format12h(720)).toBe('12:00 PM');
    expect(format12h(1290)).toBe('9:30 PM');
    expect(parseHHMM('8:05')).toBe(485);
    expect(parseHHMM('23:59')).toBe(1439);
    expect(parseHHMM('24:00')).toBeNull();
    expect(parseHHMM('abc')).toBeNull();
  });
});
