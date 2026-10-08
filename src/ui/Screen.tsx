import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AppText } from '@/ui/AppText';
import { IconButton } from '@/ui/Button';
import { spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  backLabel?: string;
  headerRight?: ReactNode;
  /** Pinned under the scroll area, e.g. the main action. */
  footer?: ReactNode;
  scroll?: boolean;
};

/** Scrollable so content stays reachable at large system font sizes. */
export function Screen({ children, title, subtitle, back = false, backLabel = 'Back', headerRight, footer, scroll = true }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const header =
    title || back ? (
      <View style={styles.headerWrap}>
        {back ? (
          <View style={styles.backRow}>
            <IconButton icon="arrow-back" label={backLabel} onPress={() => router.back()} />
          </View>
        ) : null}
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
            ) : null}
            {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
          </View>
          {headerRight}
        </View>
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content]}>
          {header}
          {children}
        </View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: c.background, borderTopColor: c.border, paddingBottom: spacing.md + insets.bottom },
          ]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  headerWrap: { gap: spacing.sm, marginBottom: spacing.xs },
  backRow: { flexDirection: 'row' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1 },
  footer: { padding: spacing.md, gap: spacing.sm, borderTopWidth: 1 },
});
