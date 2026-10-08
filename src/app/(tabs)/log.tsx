import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { buildHistory, type HistoryItem } from '@/domain/history';
import { DAY_MS, format12h, istMinutesOfDay } from '@/domain/time';
import type { Medicine } from '@/domain/types';
import { medicineTitle } from '@/features/medicines/MedicineSummary';
import { runMaintenance } from '@/services/maintenance';
import { useLoad } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Badge, Card, Divider, EmptyState, PillIcon } from '@/ui/components';
import { formatDayHeading } from '@/ui/dates';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

const HISTORY_DAYS = 60;

export default function LogScreen() {
  const { t } = useTranslation();
  const data = useLoad(async (s) => {
    // Make sure doses that just passed their window are recorded as missed before showing history.
    await runMaintenance().catch(() => undefined);
    const now = Date.now();
    const [events, medicines] = await Promise.all([
      s.repos.doses.eventsBetween(now - HISTORY_DAYS * DAY_MS, now + DAY_MS),
      s.repos.medicines.list(s.profileId, { includeInactive: true }),
    ]);
    return { days: buildHistory(events, medicines), medicines: new Map(medicines.map((m) => [m.id, m])) };
  });

  return (
    <Screen title={t('log.title')} subtitle={t('log.subtitle')}>
      {data && data.days.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-clear" title={t('log.empty')} body={t('log.emptyBody')} />
        </Card>
      ) : null}
      {data?.days.map((d) => {
        const count = (s: HistoryItem['status']) => d.items.filter((i) => i.status === s).length;
        return (
          <View key={d.day} style={styles.day}>
            <View style={styles.dayHead}>
              <AppText variant="subtitle" accessibilityRole="header">
                {formatDayHeading(d.day, t)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('log.summary', { taken: count('taken'), skipped: count('skipped'), missed: count('missed') })}
              </AppText>
            </View>
            <Card>
              {d.items.map((item, i) => {
                const m = data.medicines.get(item.medicineId);
                return (
                  <View key={`${item.medicineId}@${item.scheduledAt}`}>
                    {i > 0 ? <Divider /> : null}
                    {m ? <Row item={item} medicine={m} /> : null}
                  </View>
                );
              })}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

function Row({ item, medicine }: { item: HistoryItem; medicine: Medicine }) {
  const { t } = useTranslation();
  const c = useColors();
  const icon = item.status === 'taken' ? 'checkmark-circle' : item.status === 'skipped' ? 'remove-circle' : 'alert-circle';
  const color = item.status === 'taken' ? c.success : item.status === 'skipped' ? c.textMuted : c.danger;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${format12h(istMinutesOfDay(item.scheduledAt))}, ${medicineTitle(medicine)}, ${t(`status.${item.status}`)}`}>
      <PillIcon form={medicine.form} color={medicine.color} size={44} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{medicineTitle(medicine)}</AppText>
        <AppText variant="caption" tone="muted">
          {item.asNeeded ? t('log.asNeeded') : format12h(istMinutesOfDay(item.scheduledAt))}
          {' · '}
          {t('log.recordedAt', { time: format12h(istMinutesOfDay(item.recordedAt)) })}
          {item.via === 'notification' ? ` · ${t('log.viaNotification')}` : ''}
        </AppText>
      </View>
      <View style={styles.status}>
        <Ionicons name={icon} size={22} color={color} />
        <Badge tone={item.status === 'taken' ? 'success' : item.status === 'missed' ? 'danger' : 'neutral'} label={t(`status.${item.status}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { gap: spacing.sm },
  dayHead: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.xs },
  flex: { flex: 1 },
  status: { alignItems: 'flex-end', gap: 2 },
});
