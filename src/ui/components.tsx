import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import type { MedicineForm } from '@/domain/types';
import { AppText } from '@/ui/AppText';
import { formatQuantity } from '@/ui/format';
import type { IconName } from '@/ui/Button';
import { fonts, MIN_TOUCH_TARGET, radius, spacing } from '@/ui/theme';
import { useColors, useMedicineColor } from '@/ui/use-colors';

export function Card({ children, style, tone = 'surface' }: { children: ReactNode; style?: ViewStyle; tone?: 'surface' | 'alt' | 'primary' }) {
  const c = useColors();
  const bg = tone === 'primary' ? c.primary : tone === 'alt' ? c.surfaceAlt : c.surface;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: tone === 'surface' ? c.border : bg, shadowColor: c.shadow },
        style,
      ]}>
      {children}
    </View>
  );
}

export function PressableCard({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, shadowColor: c.shadow, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const FORM_ICON: Record<MedicineForm, IconName> = {
  tablet: 'medical',
  capsule: 'medkit',
  syrup: 'flask',
  drops: 'water',
  injection: 'bandage',
  cream: 'color-fill',
  inhaler: 'cloud',
  other: 'ellipse',
};

/** Coloured circle identifying a medicine. */
export function PillIcon({ form, color, size = 52 }: { form: MedicineForm; color: number; size?: number }) {
  const { bg, fg } = useMedicineColor(color);
  return (
    <View style={[styles.pill, { width: size, height: size, backgroundColor: bg }]} importantForAccessibility="no">
      <Ionicons name={FORM_ICON[form]} size={size * 0.48} color={fg} />
    </View>
  );
}

type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral' | 'primary';

export function Badge({ label, tone, icon }: { label: string; tone: BadgeTone; icon?: IconName }) {
  const c = useColors();
  const look = {
    success: [c.successSoft, c.success],
    danger: [c.dangerSoft, c.danger],
    warning: [c.warningSoft, c.warning],
    neutral: [c.surfaceAlt, c.textMuted],
    primary: [c.primarySoft, c.primary],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: look[0] }]}>
      {icon ? <Ionicons name={icon} size={16} color={look[1]} /> : null}
      <AppText variant="caption" style={{ color: look[1] }}>
        {label}
      </AppText>
    </View>
  );
}

export function Banner({
  tone,
  title,
  body,
  icon,
  action,
}: {
  tone: 'info' | 'warning' | 'danger';
  title: string;
  body?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  const c = useColors();
  const [bg, fg] = { info: [c.primarySoft, c.primary], warning: [c.warningSoft, c.warning], danger: [c.dangerSoft, c.danger] }[tone];
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: bg, borderColor: fg }]}>
      <View style={styles.row}>
        <Ionicons name={icon ?? (tone === 'info' ? 'information-circle' : 'warning')} size={26} color={fg} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" style={{ color: tone === 'info' ? c.text : fg }}>
            {title}
          </AppText>
          {body ? <AppText>{body}</AppText> : null}
        </View>
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}>
        <Ionicons name={icon} size={48} color={c.onAccentSoft} />
      </View>
      <AppText variant="subtitle" style={styles.center}>
        {title}
      </AppText>
      <AppText tone="muted" style={styles.center}>
        {body}
      </AppText>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="overline" tone="muted" accessibilityRole="header" style={styles.section}>
      {children.toUpperCase()}
    </AppText>
  );
}

/** Single-select pills. Each option is a 48dp target and announces its selected state. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
}) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? c.primary : c.surface,
                borderColor: selected ? c.primary : c.borderStrong,
              },
            ]}>
            {selected ? <Ionicons name="checkmark" size={18} color={c.onPrimary} /> : null}
            <AppText variant="label" style={{ color: selected ? c.onPrimary : c.text }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TextField({
  label,
  helper,
  error,
  ...input
}: TextInputProps & { label: string; helper?: string; error?: string | null }) {
  const c = useColors();
  const { i18n } = useTranslation();
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...input}
        accessibilityLabel={label}
        accessibilityHint={helper}
        allowFontScaling
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surface, borderColor: error ? c.danger : c.borderStrong },
          i18n.language === 'hi' ? { fontFamily: undefined } : null,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const c = useColors();
  const content = (
    <View style={[styles.row, styles.listRow]}>
      <View style={[styles.rowIcon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={22} color={c.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={22} color={c.textMuted} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={subtitle} onPress={onPress}>
      {({ pressed }) => <View style={{ opacity: pressed ? 0.7 : 1 }}>{content}</View>}
    </Pressable>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

/** Labelled +/- control for quantities (0.5 steps). */
export function Stepper({
  value,
  onChange,
  label,
  min = 0.5,
  step = 0.5,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  step?: number;
  unit?: string;
}) {
  const c = useColors();
  const btn = (icon: IconName, a11y: string, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={[styles.stepBtn, { borderColor: c.borderStrong, opacity: disabled ? 0.4 : 1 }]}>
      <Ionicons name={icon} size={22} color={c.text} />
    </Pressable>
  );
  return (
    <View style={[styles.row, { gap: spacing.sm }]} accessibilityLabel={label}>
      {btn('remove', `${label}: −`, Math.max(min, value - step), value <= min)}
      <AppText variant="bodyStrong" style={{ minWidth: 56, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {formatQuantity(value)}
        {unit ? ` ${unit}` : ''}
      </AppText>
      {btn('add', `${label}: +`, value + step, false)}
    </View>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pill: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  banner: { borderRadius: radius.md, borderWidth: 1.5, padding: spacing.md, gap: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  emptyIcon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyAction: { alignSelf: 'stretch', marginTop: spacing.md },
  section: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  field: { gap: spacing.xs },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 18,
  },
  listRow: { minHeight: 64, paddingVertical: spacing.sm },
  rowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
