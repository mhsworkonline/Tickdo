#!/usr/bin/env node
/**
 * Converts a licensed medicine list (CSV: brand,salt,strength,form) into
 * assets/catalog/medicines.json. See docs/catalog.md.
 *   node scripts/import-catalog.js path/to/medicines.csv
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const FORMS = { tab: 'tablet', tabs: 'tablet', tablet: 'tablet', cap: 'capsule', caps: 'capsule', capsule: 'capsule',
  syp: 'syrup', syr: 'syrup', syrup: 'syrup', susp: 'syrup', suspension: 'syrup', drop: 'drops', drops: 'drops',
  inj: 'injection', injection: 'injection', cream: 'cream', ointment: 'cream', oint: 'cream', gel: 'cream',
  inhaler: 'inhaler', other: 'other' };

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/import-catalog.js path/to/medicines.csv');
  process.exit(1);
}
const [header, ...rows] = parseCsv(fs.readFileSync(input, 'utf8').replace(/^﻿/, ''));
const idx = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
for (const col of ['brand', 'salt', 'strength', 'form']) {
  if (!(col in idx)) { console.error(`Missing column: ${col}`); process.exit(1); }
}
const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim() || null;
const seen = new Set();
const out = [];
let skipped = 0;
for (const r of rows) {
  const brand = clean(r[idx.brand]);
  const salt = clean(r[idx.salt]);
  const strength = clean(r[idx.strength]);
  const rawForm = clean(r[idx.form])?.toLowerCase() ?? null;
  const form = rawForm ? FORMS[rawForm] ?? 'other' : null;
  if (!brand && !salt) { skipped++; continue; }
  const key = [brand, salt, strength, form].join('|').toLowerCase();
  if (seen.has(key)) { skipped++; continue; }
  seen.add(key);
  const id = crypto.createHash('sha1').update(key).digest('hex').slice(0, 12);
  out.push({ id, brand, salt, strength, form });
}
const target = path.join(__dirname, '..', 'assets', 'catalog', 'medicines.json');
fs.writeFileSync(target, JSON.stringify(out));
console.log(`Wrote ${out.length} entries to ${path.relative(process.cwd(), target)} (${skipped} skipped: empty or duplicate)`);
