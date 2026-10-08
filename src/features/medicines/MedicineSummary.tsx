import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { daysRemaining } from '@/domain/refill';
import { format12h } from '@/domain/time';
import type { Medicine } from '@/domain/types';
import { AppText } from '@/ui/AppText';
import { Badge, PillIcon } from '@/ui/components';
import { formatQuantity } from '@/ui/format';
import { spacing } from '@/ui/theme';

export function medicineTitle(m: Pick<Medicine, 'name' | 'strength'>): string {
  return [m.name, m.strength].filter(Boolean).join(' ');
}

/** Name, schedule and stock at a glance. Used in lists and on the confirm screen. */
export function MedicineSummary({ medicine, showStock = true }: { medicine: Medicine; showStock?: boolean }) {
  const { t } = useTranslation();
  const days = daysRemaining(medicine);
  return (
    <View style={styles.row}>
      <PillIcon form={medicine.form} color={medicine.color} />
      <View style={styles.flex}>
        <AppText variant="subtitle">{medicineTitle(medicine)}</AppText>
        <AppText tone="muted">
          {t(`formLabels.${medicine.form}`)} · {t(`frequency.${medicine.frequency}`)}
        </AppText>
        {medicine.times.length > 0 ? (
          <View style={styles.chips}>
            {medicine.times.map((tm) => (
              <Badge
                key={tm.minutes}
                tone="primary"
                icon="alarm-outline"
                label={`${format12h(tm.minutes)} · ${formatQuantity(tm.quantity)}`}
              />
            ))}
          </View>
        ) : null}
        {showStock && medicine.unitsOnHand !== null ? (
          <View style={styles.chips}>
            {days !== null ? (
              <Badge
                tone={days < 3 ? 'danger' : 'neutral'}
                icon={days < 3 ? 'warning' : 'cube-outline'}
                label={t('medicines.daysLeft', { count: days })}
              />
            ) : (
              <Badge tone="neutral" icon="cube-outline" label={t('medicines.unitsLeft', { units: formatQuantity(medicine.unitsOnHand) })} />
            )}
          </View>
        ) : null}
        {!medicine.active ? <Badge tone="neutral" label={t('medicines.stopped')} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
