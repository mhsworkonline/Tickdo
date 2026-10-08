import { Text, type TextProps } from 'react-native';

import { typography, type TypographyVariant } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

type Props = TextProps & {
  variant?: TypographyVariant;
  muted?: boolean;
};

/** Text that always respects system font scaling. */
export function AppText({ variant = 'body', muted = false, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <Text
      {...rest}
      allowFontScaling
      style={[typography[variant], { color: muted ? colors.textMuted : colors.text }, style]}
    />
  );
}
