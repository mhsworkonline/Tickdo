import { useTranslation } from 'react-i18next';
import { Text, type TextProps } from 'react-native';

import { textStyle, type Colors, type TypographyVariant } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

type Tone = 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'warning' | 'onPrimary';

type Props = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  /** @deprecated use tone="muted" */
  muted?: boolean;
};

const toneColor = (c: Colors, tone: Tone) =>
  ({
    default: c.text,
    muted: c.textMuted,
    primary: c.primary,
    danger: c.danger,
    success: c.success,
    warning: c.warning,
    onPrimary: c.onPrimary,
  })[tone];

/**
 * Text that always respects system font scaling.
 * textBreakStrategy="simple" avoids Android's "highQuality" breaker clipping the last word with
 * some custom fonts. Hindi uses the system Devanagari font (see textStyle).
 */
export function AppText({ variant = 'body', tone = 'default', muted = false, style, ...rest }: Props) {
  const colors = useColors();
  const { i18n } = useTranslation();
  return (
    <Text
      {...rest}
      allowFontScaling
      textBreakStrategy="simple"
      style={[textStyle(variant, i18n.language), { color: toneColor(colors, muted ? 'muted' : tone) }, style]}
    />
  );
}
