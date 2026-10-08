import { interpretFrequency, validateTimes } from '@/domain/frequency';

describe('fixed abbreviation table', () => {
  it.each([
    ['OD', 'once_daily'],
    ['BD', 'twice_daily'],
    ['TDS', 'three_times_daily'],
    ['QID', 'four_times_daily'],
    ['HS', 'bedtime'],
    ['SOS', 'as_needed'],
    ['PRN', 'as_needed'],
  ])('%s → %s', (token, preset) => {
    const r = interpretFrequency(`Tab Something 500mg 1 ${token} x 5 days`);
    expect(r).toMatchObject({ kind: 'known', preset });
  });

  it.each(['b.d.', 'B.D', 'bd', 't.d.s', 'T D S', 'h.s.', 'o.d'])('normalises "%s"', (token) => {
    expect(interpretFrequency(`1 tab ${token}`).kind).toBe('known');
  });

  it.each(['BID', 'TID', 'QDS', 'BDS', 'OW', 'stat', 'q8h', 'after food', 'twice a day', 'daily'])(
    'anything outside the table is unclear: "%s"',
    (token) => {
      expect(interpretFrequency(`Tab X 1 ${token}`).kind).toBe('unclear');
    },
  );

  it('does not match abbreviations inside words', () => {
    expect(interpretFrequency('Dr. Sood, Hospital Road').kind).toBe('unclear');
    expect(interpretFrequency('Odomos cream').kind).toBe('unclear');
  });
});

describe('dash patterns', () => {
  it('1-0-1 is twice daily, morning and night', () => {
    expect(interpretFrequency('Tab Metformin 500 1-0-1')).toEqual({
      kind: 'known',
      preset: 'twice_daily',
      token: '1-0-1',
      slots: [
        { slot: 'morning', quantity: 1 },
        { slot: 'night', quantity: 1 },
      ],
    });
  });

  it('1-1-1 is three times daily', () => {
    expect(interpretFrequency('1 - 1 - 1')).toMatchObject({ kind: 'known', preset: 'three_times_daily' });
  });

  it('0-0-1 is once daily at night', () => {
    expect(interpretFrequency('0-0-1')).toMatchObject({ preset: 'once_daily', slots: [{ slot: 'night', quantity: 1 }] });
  });

  it('1-1-1-1 is four times daily', () => {
    expect(interpretFrequency('1-1-1-1')).toMatchObject({ preset: 'four_times_daily' });
  });

  it('records quantities as written, including halves', () => {
    expect(interpretFrequency('½-0-½')).toMatchObject({
      slots: [
        { slot: 'morning', quantity: 0.5 },
        { slot: 'night', quantity: 0.5 },
      ],
    });
    expect(interpretFrequency('1/2-0-1')).toMatchObject({
      slots: [
        { slot: 'morning', quantity: 0.5 },
        { slot: 'night', quantity: 1 },
      ],
    });
    expect(interpretFrequency('2-0-2')).toMatchObject({ slots: [{ quantity: 2 }, { quantity: 2 }] });
  });

  it('0-0-0 is unclear', () => {
    expect(interpretFrequency('0-0-0').kind).toBe('unclear');
  });

  it('dates and phone numbers are not dose patterns', () => {
    expect(interpretFrequency('Date: 12-10-2026').kind).toBe('unclear');
    expect(interpretFrequency('Ph 98-111-2222').kind).toBe('unclear');
  });

  it('consistent signals agree; conflicting signals are unclear', () => {
    expect(interpretFrequency('BD 1-0-1')).toMatchObject({ kind: 'known', preset: 'twice_daily', token: '1-0-1' });
    expect(interpretFrequency('TDS 1-0-1').kind).toBe('unclear');
    expect(interpretFrequency('OD BD').kind).toBe('unclear');
  });

  it('nothing at all is unclear with no token', () => {
    expect(interpretFrequency('Paracetamol 500mg')).toEqual({ kind: 'unclear', token: null });
  });
});

describe('validateTimes', () => {
  const t = (minutes: number, quantity = 1) => ({ minutes, quantity });

  it('requires the preset count', () => {
    expect(validateTimes('once_daily', [t(480)])).toEqual({ ok: true });
    expect(validateTimes('twice_daily', [t(480)])).toEqual({ ok: false, reason: 'wrong_count' });
    expect(validateTimes('four_times_daily', [t(1), t(2), t(3), t(4)])).toEqual({ ok: true });
    expect(validateTimes('as_needed', [])).toEqual({ ok: true });
    expect(validateTimes('as_needed', [t(1)])).toEqual({ ok: false, reason: 'wrong_count' });
    expect(validateTimes('custom', [])).toEqual({ ok: false, reason: 'wrong_count' });
    expect(validateTimes('custom', [t(1), t(2), t(3), t(4), t(5)])).toEqual({ ok: true });
  });

  it('rejects duplicates, bad times and bad quantities', () => {
    expect(validateTimes('twice_daily', [t(480), t(480)])).toEqual({ ok: false, reason: 'duplicate_time' });
    expect(validateTimes('once_daily', [t(1440)])).toEqual({ ok: false, reason: 'invalid_time' });
    expect(validateTimes('once_daily', [t(480, 0)])).toEqual({ ok: false, reason: 'invalid_quantity' });
    expect(validateTimes('once_daily', [t(480, Number.NaN)])).toEqual({ ok: false, reason: 'invalid_quantity' });
  });
});
