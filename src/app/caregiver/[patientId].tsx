import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { format12h, istDateKey, istMinutesOfDay, type DateKey } from '@/domain/time';
import { patientDoses, type RemoteDose } from '@/features/caregiver/api';
import { AppText } from '@/ui/AppText';
import { IconButton } from '@/ui/Button';
import { Badge, Banner, Card, Divider, EmptyState } from '@/ui/components';
import { formatDayHeading } from '@/ui/dates';
import { spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

const TONE = { taken: 'success', skipped: 'neutral', missed: 'danger', pending: 'warning' } as const;

/** Read-only view of a patient's shared dose history, for their caregiver. */
export default function PatientLog() {
  const { t } = useTranslation();
  const c = useColors();
  const { patientId, name } = useLocalSearchParams<{ patientId: string; name?: string }>();
  const [doses, setDoses] = useState<RemoteDose[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setDoses(await patientDoses(patientId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [patientId]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const byDay = new Map<DateKey, RemoteDose[]>();
  for (const d of doses ?? []) {
    const key = istDateKey(Date.parse(d.scheduled_at));
    byDay.set(key, [...(byDay.get(key) ?? []), d]);
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }>
        <IconButton icon="arrow-back" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="title" accessibilityRole="header">
          {t('caregiver.patientLogTitle', { name: name || t('caregiver.unnamed') })}
        </AppText>
        {failed ? <Banner tone="danger" icon="cloud-offline" title={t('caregiver.offline')} /> : null}
        {doses && doses.length === 0 ? (
          <Card>
            <EmptyState icon="calendar-clear" title={t('caregiver.noDoses')} body={t('caregiver.whatIsShared')} />
          </Card>
        ) : null}
        {[...byDay.entries()].map(([day, list]) => (
          <View key={day} style={{ gap: spacing.sm }}>
            <AppText variant="subtitle">{formatDayHeading(day, t)}</AppText>
            <Card>
              {list.map((d, i) => {
                const at = Date.parse(d.scheduled_at);
                return (
                  <View key={d.dose_key}>
                    {i > 0 ? <Divider /> : null}
                    <View style={styles.row}>
                      <Ionicons
                        name={d.status === 'taken' ? 'checkmark-circle' : d.status === 'missed' ? 'alert-circle' : d.status === 'skipped' ? 'remove-circle' : 'time-outline'}
                        size={26}
                        color={d.status === 'taken' ? c.success : d.status === 'missed' ? c.danger : c.textMuted}
                      />
                      <View style={styles.flex}>
                        <AppText variant="bodyStrong">{d.medicine_label}</AppText>
                        <AppText variant="caption" tone="muted">
                          {format12h(istMinutesOfDay(at))}
                          {d.recorded_at ? ` · ${t('log.recordedAt', { time: format12h(istMinutesOfDay(Date.parse(d.recorded_at))) })}` : ''}
                        </AppText>
                      </View>
                      <Badge tone={TONE[d.status]} label={t(`status.${d.status === 'pending' ? 'upcoming' : d.status}`)} />
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60 },
});
