import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { ResolvedDose } from '@/domain/dose-status';
import { format12h, istMinutesOfDay } from '@/domain/time';
import type { Medicine } from '@/domain/types';
import { AppText } from '@/ui/AppText';
import { Button, type IconName } from '@/ui/Button';
import { Badge, Card, PillIcon } from '@/ui/components';
import { formatQuantity } from '@/ui/format';
import { spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

type Props = {
  dose: ResolvedDose;
  medicine: Medicine;
  onTaken: () => void;
  onSkip: () => void;
  onUndo: () => void;
};

const STATUS_LOOK: Record<ResolvedDose['status'], { tone: 'success' | 'danger' | 'warning' | 'neutral' | 'primary'; icon: IconName }> = {
  taken: { tone: 'success', icon: 'checkmark-circle' },
  skipped: { tone: 'neutral', icon: 'remove-circle' },
  missed: { tone: 'danger', icon: 'alert-circle' },
  due: { tone: 'warning', icon: 'alarm' },
  snoozed: { tone: 'primary', icon: 'time' },
  upcoming: { tone: 'neutral', icon: 'time-outline' },
};

export function DoseCard({ dose, medicine, onTaken, onSkip, onUndo }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const time = format12h(istMinutesOfDay(dose.scheduledAt));
  const decided = dose.status === 'taken' || dose.status === 'skipped';
  const look = STATUS_LOOK[dose.status];
  const title = [medicine.name, medicine.strength].filter(Boolean).join(' ');
  const accent =
    dose.status === 'missed' ? c.danger : dose.status === 'due' ? c.accent : dose.status === 'taken' ? c.success : c.border;

  return (
    <Card style={{ borderLeftWidth: 6, borderLeftColor: accent }}>
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${time}, ${title}, ${t('today.takeQuantity', {
          quantity: formatQuantity(dose.quantity),
          form: t(`forms.${medicine.form}`),
        })}, ${t(`status.${dose.status}`)}`}>
        <PillIcon form={medicine.form} color={medicine.color} />
        <View style={styles.flex}>
          <AppText variant="subtitle" style={decided ? { opacity: 0.8 } : undefined}>
            {time}
          </AppText>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText tone="muted">
            {t('today.takeQuantity', { quantity: formatQuantity(dose.quantity), form: t(`forms.${medicine.form}`) })}
          </AppText>
        </View>
        <Badge label={t(`status.${dose.status}`)} tone={look.tone} icon={look.icon} />
      </View>

      {decided ? (
        <View style={styles.decided}>
          <AppText variant="caption" tone="muted" style={styles.flex}>
            {t(dose.status === 'taken' ? 'today.takenAt' : 'today.skippedAt', {
              time: dose.recordedAt ? format12h(istMinutesOfDay(dose.recordedAt)) : '',
            })}
          </AppText>
          <Button label={t('today.undo')} variant="ghost" compact onPress={onUndo} />
        </View>
      ) : (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button testID={`taken-${dose.key}`} label={t('today.markTaken')} icon="checkmark" onPress={onTaken} />
          </View>
          <View style={styles.flex}>
            <Button label={t('today.markSkip')} variant="secondary" onPress={onSkip} />
          </View>
        </View>
      )}
      {dose.status === 'snoozed' && dose.snoozeUntil ? (
        <AppText variant="caption" tone="primary">
          {t('today.snoozedUntil', { time: format12h(istMinutesOfDay(dose.snoozeUntil)) })}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  decided: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
