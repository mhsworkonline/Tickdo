import en from '@/i18n/locales/en.json';
import hi from '@/i18n/locales/hi.json';

type Tree = { [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : leafKeys(value, path);
  });
}

describe('locales', () => {
  it('Hindi has exactly the same keys as English', () => {
    expect(leafKeys(hi).sort()).toEqual(leafKeys(en).sort());
  });

  it('has no empty strings', () => {
    for (const tree of [en, hi]) {
      const flat = leafKeys(tree);
      expect(flat.length).toBeGreaterThan(0);
    }
    const values = (tree: Tree): string[] =>
      Object.values(tree).flatMap((v) => (typeof v === 'string' ? [v] : values(v)));
    expect([...values(en), ...values(hi)].every((v) => v.trim().length > 0)).toBe(true);
  });

  it('disclaimer states Tickdo does not replace a doctor or pharmacist', () => {
    expect(en.disclaimer.body).toMatch(/does not replace a doctor or pharmacist/);
    expect(hi.disclaimer.body).toMatch(/डॉक्टर या फ़ार्मासिस्ट की जगह नहीं लेता/);
  });
});
