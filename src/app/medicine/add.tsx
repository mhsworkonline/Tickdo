import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useScanSettings } from '@/features/scan/settings';
import { AppText } from '@/ui/AppText';
import type { IconName } from '@/ui/Button';
import { PressableCard } from '@/ui/components';
import { Screen } from '@/ui/Screen';
import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

/** "Add by typing" and "Scan prescription" are deliberately equal choices. */
export default function AddMedicine() {
  const { t } = useTranslation();
  const scan = useScanSettings();

  return (
    <Screen back backLabel={t('common.back')} title={t('add.title')} subtitle={t('add.subtitle')}>
      <Choice
        testID="add-typing"
        icon="create"
        title={t('add.typeTitle')}
        body={t('add.typeBody')}
        onPress={() => router.push('/medicine/new')}
      />
      <Choice
        testID="add-scan"
        icon="camera"
        title={t('add.scanTitle')}
        body={scan.enabled ? t('add.scanBody') : t('add.scanOffNote')}
        disabled={!scan.enabled}
        onPress={() => router.push('/scan')}
      />
    </Screen>
  );
}

function Choice({
  icon,
  title,
  body,
  onPress,
  disabled = false,
  testID,
}: {
  icon: IconName;
  title: string;
  body: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const c = useColors();
  return (
    <PressableCard
      testID={testID}
      accessibilityLabel={title}
      accessibilityHint={body}
      onPress={disabled ? () => router.push('/settings/scanning') : onPress}
      style={disabled ? { ...styles.choice, opacity: 0.6 } : styles.choice}>
      <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={36} color={c.primary} />
      </View>
      <AppText variant="title">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
      <View style={styles.go}>
        <Ionicons name="arrow-forward-circle" size={36} color={c.primary} />
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  choice: { padding: spacing.lg, gap: spacing.sm },
  icon: { width: 72, height: 72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  go: { alignItems: 'flex-end' },
});
