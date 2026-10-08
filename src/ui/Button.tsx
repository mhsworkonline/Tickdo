import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/AppText';
import { MIN_TOUCH_TARGET, radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  compact = false,
  accessibilityHint,
  testID,
}: Props) {
  const c = useColors();
  const look = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: c.surface, fg: c.primary, border: c.primary },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    danger: { bg: c.dangerSoft, fg: c.danger, border: c.danger },
    soft: { bg: c.primarySoft, fg: c.primary, border: c.primarySoft },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        {
          backgroundColor: look.bg,
          borderColor: look.border,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={look.fg} />
        ) : icon ? (
          <Ionicons name={icon} size={22} color={look.fg} />
        ) : null}
        <AppText variant="label" style={{ color: look.fg, textAlign: 'center', flexShrink: 1 }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
};

/** Icon-only button; `label` is read by screen readers. Always 48×48. */
export function IconButton({ icon, label, onPress, tone = 'default' }: IconButtonProps) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: tone === 'primary' ? c.primarySoft : c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name={icon} size={24} color={tone === 'primary' ? c.primary : c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    minWidth: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compact: { minHeight: MIN_TOUCH_TARGET, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
