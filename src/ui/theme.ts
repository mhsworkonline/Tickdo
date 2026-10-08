/**
 * Tickdo design tokens.
 *
 * Audience: older adults and caregivers in India. Warm and calm, never clinical:
 * cream paper background, deep teal for actions, saffron as the warm accent.
 * Every text/background pair below meets WCAG AA (most AAA). Touch targets ≥ 48dp.
 * Sizes are dp and scale with the system font size (never disable font scaling).
 *
 * Fonts (SIL OFL, both cover Latin + Devanagari): Baloo 2 for headings, Mukta for text.
 */

export const MIN_TOUCH_TARGET = 48;

export const palette = {
  light: {
    background: '#FBF7F1',
    surface: '#FFFFFF',
    surfaceAlt: '#F3EDE3',
    text: '#1C1917',
    textMuted: '#57534E',
    primary: '#0F5E57',
    onPrimary: '#FFFFFF',
    primarySoft: '#DCEFEA',
    accent: '#E8962E',
    accentSoft: '#FCEBD3',
    onAccentSoft: '#7A4300',
    success: '#166534',
    successSoft: '#DCFCE7',
    danger: '#B42318',
    dangerSoft: '#FDE7E4',
    warning: '#8A5300',
    warningSoft: '#FFF1D6',
    border: '#E2DACE',
    borderStrong: '#8C8379',
    shadow: '#3B2F1E',
  },
  dark: {
    background: '#0E1513',
    surface: '#17211E',
    surfaceAlt: '#1F2B27',
    text: '#F5F2EC',
    textMuted: '#C4BDB2',
    primary: '#5ED1B9',
    onPrimary: '#05201B',
    primarySoft: '#18352F',
    accent: '#F2B35E',
    accentSoft: '#3A2A12',
    onAccentSoft: '#FFD49A',
    success: '#6EE7A0',
    successSoft: '#143322',
    danger: '#FF9A8C',
    dangerSoft: '#3A1A16',
    warning: '#FFC266',
    warningSoft: '#33270F',
    border: '#2E3B37',
    borderStrong: '#7C8B86',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { readonly [K in keyof typeof palette.light]: string };

/** Per-medicine identity colours (background, foreground) — distinct in light and dark. */
export const medicineColors = {
  light: [
    ['#D7EFE9', '#0F5E57'],
    ['#FCE3C2', '#8A4B00'],
    ['#EADCF5', '#5B2A86'],
    ['#FBD9D3', '#9A2A1A'],
    ['#D6E8FA', '#1D4F8C'],
    ['#E3EBC9', '#4A5A12'],
    ['#F8D7E6', '#8E1D52'],
    ['#DCDDF7', '#33368C'],
  ],
  dark: [
    ['#18352F', '#7FE0CB'],
    ['#3A2A12', '#FFC982'],
    ['#2E2240', '#D6B6F5'],
    ['#3D1F1A', '#FFB0A3'],
    ['#172A40', '#A8CCF5'],
    ['#262E14', '#C9DB8C'],
    ['#3A1A2A', '#F5A8CB'],
    ['#1E2040', '#B6B9F5'],
  ],
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const fonts = {
  heading: 'Baloo2_700Bold',
  headingSemi: 'Baloo2_600SemiBold',
  body: 'Mukta_400Regular',
  bodyMedium: 'Mukta_500Medium',
  bodySemi: 'Mukta_600SemiBold',
  bodyBold: 'Mukta_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 34 },
  subtitle: { fontFamily: fonts.headingSemi, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 26 },
  label: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 24 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, letterSpacing: 1 },
} as const;

export type TypographyVariant = keyof typeof typography;

/**
 * Hindi body text uses the system Devanagari font (Noto Sans Devanagari on Android). Mukta's
 * Devanagari is measured incorrectly by Android's text layout and clips words in chips and
 * buttons. Headings keep Baloo 2, which renders Devanagari correctly.
 */
const SYSTEM_WEIGHT: Partial<Record<TypographyVariant, '400' | '500' | '600' | '700'>> = {
  body: '400',
  bodyStrong: '600',
  label: '600',
  caption: '500',
  overline: '700',
};

export function textStyle(variant: TypographyVariant, language: string) {
  const base = typography[variant];
  const weight = SYSTEM_WEIGHT[variant];
  if (language !== 'hi' || !weight) return base;
  const { fontFamily: _ignored, ...rest } = base;
  return { ...rest, fontWeight: weight };
}
