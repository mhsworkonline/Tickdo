import Fuse, { type IFuseOptions } from 'fuse.js';

import { distanceRatio } from '@/features/catalog/similarity';

/**
 * The local medicine list (brand, salt, strength, form).
 *
 * The data must come from a source licensed for commercial use and is supplied by the product
 * owner (see docs/catalog.md). Until then assets/catalog/medicines.json is an empty list and
 * users type medicine names themselves.
 */
export type CatalogEntry = {
  id: string;
  brand: string | null;
  salt: string | null;
  strength: string | null;
  form: string | null;
};

/** score: 0 = identical; for OCR matching it is the edit-distance ratio. */
export type CatalogMatch = { entry: CatalogEntry; score: number };

/** Display name for an entry: "Brand (salt)" when both exist. */
export function catalogDisplayName(e: CatalogEntry): string {
  if (e.brand && e.salt && e.brand.toLowerCase() !== e.salt.toLowerCase()) return `${e.brand} (${e.salt})`;
  return e.brand ?? e.salt ?? '';
}

const FUSE_OPTIONS: IFuseOptions<CatalogEntry> = {
  keys: [
    { name: 'brand', weight: 0.6 },
    { name: 'salt', weight: 0.4 },
  ],
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 3,
  threshold: 0.4,
};

export type Catalog = {
  size: number;
  /** For the manual-entry search box (looser, ranked). */
  search(query: string, limit?: number): CatalogMatch[];
  /**
   * For OCR lines: the entry whose brand or salt name is closest to `text` as a whole word,
   * only if at most `maxRatio` of its characters differ. Prefixes and partial names do not
   * match ("Amlo" is not "Amlodipine"). Ties prefer an entry whose strength equals `strength`.
   */
  matchName(text: string, maxRatio: number, strength?: string | null): CatalogMatch | null;
};

export function createCatalog(entries: readonly CatalogEntry[]): Catalog {
  const fuse = new Fuse(entries, FUSE_OPTIONS);
  // Index names by first letter for fast whole-word matching.
  const byLetter = new Map<string, { name: string; entry: CatalogEntry }[]>();
  for (const entry of entries) {
    for (const name of new Set([entry.brand, entry.salt].filter((n): n is string => !!n))) {
      const key = name[0]?.toLowerCase() ?? '';
      const list = byLetter.get(key) ?? [];
      list.push({ name, entry });
      byLetter.set(key, list);
    }
  }
  const rank = (query: string, limit: number): CatalogMatch[] =>
    fuse.search(query.trim(), { limit }).map((r) => ({ entry: r.item, score: r.score ?? 1 }));
  return {
    size: entries.length,
    search(query, limit = 8) {
      return query.trim().length < 2 ? [] : rank(query, limit);
    },
    matchName(text, maxRatio, strength) {
      const q = text.trim();
      if (q.length < 4) return null;
      let best: CatalogMatch | null = null;
      for (const { name, entry } of byLetter.get(q[0]?.toLowerCase() ?? '') ?? []) {
        if (Math.abs(name.length - q.length) > Math.ceil(name.length * maxRatio)) continue;
        const score = distanceRatio(q, name);
        if (score > maxRatio) continue;
        const better =
          !best ||
          score < best.score ||
          (score === best.score && !!strength && entry.strength === strength && best.entry.strength !== strength);
        if (better) best = { entry, score };
      }
      return best;
    },
  };
}

let cached: Catalog | null = null;

export function getCatalog(): Catalog {
  if (!cached) {
    const raw: unknown = require('../../../assets/catalog/medicines.json');
    cached = createCatalog(Array.isArray(raw) ? (raw as CatalogEntry[]) : []);
  }
  return cached;
}
