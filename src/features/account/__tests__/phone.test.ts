import { formatIndianMobile, normalizeIndianMobile } from '@/features/account/phone';

describe('normalizeIndianMobile', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['098765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['6000000000', '+916000000000'],
  ])('%s → %s', (input, out) => {
    expect(normalizeIndianMobile(input)).toBe(out);
  });

  it.each(['', '12345', '5876543210', '98765432101', '+1 415 555 0100', '0123456789'])('rejects %p', (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });

  it('formats for display', () => {
    expect(formatIndianMobile('+919876543210')).toBe('+91 98765 43210');
  });
});
