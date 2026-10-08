import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/ui/AppText';
import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

/** Medical disclaimer. Shown in onboarding (must be accepted) and in Settings. */
export function Disclaimer() {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <View accessibilityRole="summary" style={[styles.box, { backgroundColor: c.warningSoft, borderColor: c.warning }]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: c.surface }]}>
          <Ionicons name="medkit" size={28} color={c.warning} />
        </View>
        <AppText variant="title" style={{ color: c.warning }}>
          {t('disclaimer.title')}
        </AppText>
      </View>
      <AppText>{t('disclaimer.body')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 52, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
