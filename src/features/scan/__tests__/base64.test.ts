import { base64ToBytes } from '@/features/scan/base64';

describe('base64ToBytes', () => {
  it.each(['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar', 'Tickdo ✓ टिक'])('round-trips %p', (s) => {
    const bytes = new TextEncoder().encode(s);
    const b64 = Buffer.from(bytes).toString('base64');
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
  });
});
