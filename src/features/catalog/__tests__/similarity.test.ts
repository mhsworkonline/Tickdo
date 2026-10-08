import { distanceRatio, editDistance } from '@/features/catalog/similarity';

describe('editDistance', () => {
  it.each([
    ['paracetamol', 'paracetamol', 0],
    ['Paracetmol', 'Paracetamol', 1], // deletion
    ['Metfromin', 'Metformin', 1], // transposition
    ['Amoxycilin', 'Amoxicillin', 2], // substitution + deletion
    ['', 'abc', 3],
    ['kitten', 'sitting', 3],
  ])('%s vs %s = %i', (a, b, d) => {
    expect(editDistance(a, b)).toBe(d);
  });

  it('is symmetric and case-insensitive', () => {
    expect(editDistance('AMLODIPINE', 'amlodipne')).toBe(editDistance('amlodipne', 'Amlodipine'));
  });
});

describe('distanceRatio', () => {
  it('truncated names are far from the full name', () => {
    expect(distanceRatio('Amlo', 'Amlodipine')).toBeCloseTo(0.6);
    expect(distanceRatio('Telma', 'Telmisartan')).toBeGreaterThan(0.5);
  });

  it('single typos in long names are close', () => {
    expect(distanceRatio('Paracetmol', 'Paracetamol')).toBeLessThan(0.1);
  });
});
