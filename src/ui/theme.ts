/**
 * Design tokens. Tickdo is designed for older users and caregivers:
 * high contrast (WCAG AA+ for all text pairs), large type, 48dp minimum touch targets.
 * Font sizes are in dp and scale with the system font setting (never disable allowFontScaling).
 */

export const MIN_TOUCH_TARGET = 48;

export const palette = {
  light: {
    background: '#FFFFFF',
    surface: '#F3F5F4',
    text: '#111111',
    textMuted: '#3D4543',
    primary: '#0B6E4F',
    onPrimary: '#FFFFFF',
    border: '#5C6663',
    danger: '#B00020',
    warning: '#7A4D00',
    warningSurface: '#FFF4D6',
    success: '#0B6E4F',
  },
  dark: {
    background: '#000000',
    surface: '#1A1D1C',
    text: '#FFFFFF',
    textMuted: '#C9D1CE',
    primary: '#5FD3A6',
    onPrimary: '#00140D',
    border: '#A3ADAA',
    danger: '#FF8A80',
    warning: '#FFD27A',
    warningSurface: '#2E2410',
    success: '#5FD3A6',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { readonly [K in keyof typeof palette.light]: string };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  body: { fontSize: 18, lineHeight: 26 },
  label: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '700' },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  caption: { fontSize: 16, lineHeight: 22 },
} as const;

export type TypographyVariant = keyof typeof typography;
