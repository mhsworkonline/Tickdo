import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

/** Onboarding progress, e.g. step 2 of 4. Announced as text for screen readers. */
export function StepDots({ step, total }: { step: number; total: number }) {
  const c = useColors();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${step} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i < step ? c.primary : c.border, width: i === step - 1 ? 28 : 10 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  dot: { height: 10, borderRadius: radius.pill },
});
