import { batteryBrand } from '@/features/setup/brand';

describe('batteryBrand', () => {
  it.each([
    ['Xiaomi', 'xiaomi'],
    ['Redmi', 'xiaomi'],
    ['POCO', 'xiaomi'],
    ['realme', 'realme'],
    ['OPPO', 'realme'],
    ['OnePlus', 'realme'],
    ['vivo', 'vivo'],
    ['iQOO', 'vivo'],
    ['samsung', 'samsung'],
    ['Google', 'generic'],
    ['motorola', 'generic'],
    ['', 'generic'],
  ])('%s → %s', (m, brand) => {
    expect(batteryBrand(m)).toBe(brand);
  });

  it('handles null', () => {
    expect(batteryBrand(null)).toBe('generic');
  });
});
