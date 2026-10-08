/** Phone families with known aggressive battery management (common in India). */
export type BatteryBrand = 'xiaomi' | 'realme' | 'vivo' | 'samsung' | 'generic';

const PATTERNS: [RegExp, BatteryBrand][] = [
  [/xiaomi|redmi|poco|^mi$/i, 'xiaomi'],
  [/realme|oppo|oneplus/i, 'realme'],
  [/vivo|iqoo/i, 'vivo'],
  [/samsung/i, 'samsung'],
];

export function batteryBrand(manufacturer: string | null | undefined): BatteryBrand {
  const m = (manufacturer ?? '').trim();
  for (const [re, brand] of PATTERNS) if (re.test(m)) return brand;
  return 'generic';
}

export const BRAND_LABEL: Record<BatteryBrand, string> = {
  xiaomi: 'Xiaomi / Redmi / POCO',
  realme: 'Realme / OPPO / OnePlus',
  vivo: 'Vivo / iQOO',
  samsung: 'Samsung',
  generic: 'Android',
};
