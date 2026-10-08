import type { OcrLineInput } from '@/features/scan/parser';

/**
 * Sample ML Kit outputs (text + line boxes) covering the cases the parser must handle:
 * printed and handwritten-style misspellings, unclear abbreviations, split rows, headers,
 * Devanagari lines and empty results. Positions are in image pixels.
 */
let y = 0;
function line(text: string, left = 40, height = 40): OcrLineInput {
  y += 60;
  return { text, left, top: y, width: text.length * 18, height };
}
function sameRow(parts: [string, number][], height = 40): OcrLineInput[] {
  y += 60;
  return parts.map(([text, left]) => ({ text, left, top: y + (left % 7), width: text.length * 18, height }));
}

y = 0;
export const PRINTED = [
  line('Dr. R. K. Sharma MBBS, MD'),
  line('City Clinic, MG Road, Pune  Ph 98-111-2222'),
  line('Date: 12-10-2026'),
  line('Rx'),
  line('1. Tab. Paracetamol 500mg 1-0-1 x 5 days'),
  line('2. Cap Amoxicillin 500 mg TDS x 7 days'),
  line('3. Syp. Cetirizine 5mg/5ml HS'),
  line('4. Tab Pantoprazole 40mg OD before breakfast'),
  line('Review after 1 week'),
];

y = 0;
export const HANDWRITTEN_STYLE = [
  line('Tab Paracetmol 500 1-0-1'), // misspelt name
  line('Cap Amoxycilin 500mg BD'), // misspelt name
  line('Tab Metfromin 500mg'), // transposed letters, frequency on next row
  line('1 - 0 - 1 after food'),
  line('T. Azithromycin 500 OD x3d'),
];

y = 0;
export const UNCLEAR = [
  line('Tab Pantoprazole 40 BDS'), // BDS is not in the table
  line('Tab Telmisartan 40mg q8h'), // not in the table
  line('Tab Amlodipine 5mg TDS 1-0-1'), // conflicting
  line('Tab Ibuprofen 4OO mg SOS'), // OCR "4OO" — strength must not be guessed
  line('Tab Xyzzolin 10mg OD'), // not in catalogue
];

y = 0;
export const SPLIT_ROW = [
  ...sameRow([
    ['Tab Atorvastatin', 40],
    ['10 mg', 520],
    ['0-0-1', 760],
  ]),
  ...sameRow([
    ['Tab Domperidone 10mg', 40],
    ['1-1-1', 760],
  ]),
];

y = 0;
export const DEVANAGARI = [line('Tab Ondansetron 4mg SOS'), line('उल्टी होने पर एक गोली'), line('भोजन के बाद')];

export const EMPTY: OcrLineInput[] = [];
y = 0;
export const NOISE = [line('~'), line('|| .'), line('1')];
