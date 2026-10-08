#!/usr/bin/env node
/** Renders a synthetic (fake) prescription image used by the Diagnostics OCR self-test. */
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const lines = [
  ['Dr. A. Example, MBBS', 34, 'bold'],
  ['Sample Clinic - not a real prescription', 22, 'normal'],
  ['Rx', 30, 'bold'],
  ['1. Tab. Paracetamol 500mg 1-0-1 x 5 days', 28, 'normal'],
  ['2. Cap. Amoxicillin 500 mg TDS', 28, 'normal'],
  ['3. Syp. Cetirizine 5mg/5ml HS', 28, 'normal'],
  ['भोजन के बाद', 28, 'normal'],
];
const body = lines
  .map(([t, size, weight], i) => `<text x="40" y="${80 + i * 64}" font-size="${size}" font-weight="${weight}" font-family="Arial, Nirmala UI, Noto Sans Devanagari, sans-serif" fill="#111">${t}</text>`)
  .join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560"><rect width="900" height="560" fill="#fbfaf6"/>${body}</svg>`;
const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'samples', 'ocr-sample.png'), png);
console.log('assets/samples/ocr-sample.png', png.length, 'bytes');
