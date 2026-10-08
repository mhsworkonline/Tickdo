import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/ui/AppText';
import { spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

/** Medical disclaimer. Shown in onboarding (must be accepted) and in Settings. */
export function Disclaimer() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View
      accessibilityRole="summary"
      style={[styles.box, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
      <AppText variant="subtitle">{t('disclaimer.title')}</AppText>
      <AppText>{t('disclaimer.body')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
});
