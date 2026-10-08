/**
 * Optimal-string-alignment (Damerau–Levenshtein) distance: insertions, deletions,
 * substitutions and adjacent transpositions each cost 1. Case-insensitive.
 */
export function editDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = new Array<number>(n + 1).fill(0);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      let v = Math.min((prev[j] as number) + 1, (cur[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) v = Math.min(v, (prev2[j - 2] as number) + 1);
      cur[j] = v;
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[n] as number;
}

/** 0 = identical … 1 = completely different, relative to the longer string. */
export function distanceRatio(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  return len === 0 ? 0 : editDistance(a, b) / len;
}
