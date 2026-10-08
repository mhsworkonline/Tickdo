import fs from 'node:fs';
import path from 'node:path';

import en from '@/i18n/locales/en.json';

type Tree = { [key: string]: unknown };

function has(tree: Tree, key: string): boolean {
  let node: unknown = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return false;
    const obj = node as Tree;
    // i18next plural keys: "x" may exist only as "x_one" / "x_other"
    if (!(part in obj) && !(`${part}_one` in obj && `${part}_other` in obj)) return false;
    node = obj[part] ?? obj[`${part}_other`];
  }
  return true;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d: fs.Dirent) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(d.name) ? [p] : [];
  });
}

describe('translation keys', () => {
  it('every literal t("…") key used in the app exists in English', () => {
    const root = path.join(__dirname, '..', '..');
    const missing: string[] = [];
    // t('a.b'), t("a.b"), and { key: 'form.x' } style error keys
    const re = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]|key:\s*'((?:form|errors)\.[a-zA-Z0-9_.]+)'/g;
    for (const file of sourceFiles(root)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(re)) {
        const key = m[1] ?? m[2];
        if (key && !has(en as Tree, key)) missing.push(`${path.relative(root, file)}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
