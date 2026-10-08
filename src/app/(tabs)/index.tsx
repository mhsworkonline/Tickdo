import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { clock } from '@/domain/clock';
import { resolveDoses, summarise, type ResolvedDose } from '@/domain/dose-status';
import { canUseRefillAlerts } from '@/domain/entitlements';
import { needsRefill } from '@/domain/refill';
import { dosesForDay } from '@/domain/schedule';
import { istDateKey, istDayRange, istMinutesOfDay } from '@/domain/time';
import type { Medicine } from '@/domain/types';
import { DoseCard } from '@/features/medicines/DoseCard';
import { getSetupStatus, setupComplete } from '@/features/setup/status';
import { useLoad, useNow, useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Banner, Card, EmptyState, PillIcon, SectionTitle } from '@/ui/components';
import { formatLongDate, greetingKey, periodOf, type Period } from '@/ui/dates';
import { ProgressRing } from '@/ui/ProgressRing';
import { Screen } from '@/ui/Screen';
import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

const PERIODS: Period[] = ['morning', 'afternoon', 'evening', 'night'];

export default function TodayScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const { repos, changed, version, plan } = useServices();
  const now = useNow();
  const day = istDateKey(now);
  const [setupOk, setSetupOk] = useState(true);

  const data = useLoad(
    async (s) => {
      const range = istDayRange(day);
      const [medicines, events, profile] = await Promise.all([
        s.repos.medicines.list(s.profileId),
        s.repos.doses.eventsBetween(range.start, range.end),
        s.repos.profiles.get(s.profileId),
      ]);
      return { medicines, events, name: profile?.name ?? '' };
    },
    [day],
  );

  useEffect(() => {
    getSetupStatus()
      .then((st) => setSetupOk(setupComplete(st)))
      .catch(() => undefined);
  }, [version]);

  if (!data) return <Screen>{null}</Screen>;

  const byId = new Map(data.medicines.map((m) => [m.id, m]));
  const doses = resolveDoses(dosesForDay(data.medicines, day), data.events, now);
  const summary = summarise(doses);
  const asNeeded = data.medicines.filter((m) => m.frequency === 'as_needed');
  const lowStock = canUseRefillAlerts(plan) ? data.medicines.filter(needsRefill) : [];
  const greeting = t(`greeting.${greetingKey(istMinutesOfDay(now))}`);

  const record = async (d: ResolvedDose, kind: 'taken' | 'skipped' | 'cleared') => {
    await repos.doses.record({ medicineId: d.medicineId, scheduledAt: d.scheduledAt, kind, via: 'app', quantity: d.quantity });
    changed();
  };

  const logAsNeeded = async (m: Medicine) => {
    await repos.doses.record({ medicineId: m.id, scheduledAt: clock.now(), kind: 'taken', via: 'app', quantity: m.times[0]?.quantity ?? 1 });
    changed();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header">
            {data.name ? t('greeting.withName', { greeting, name: data.name }) : greeting}
          </AppText>
          <AppText tone="muted">{formatLongDate(day, t)}</AppText>
        </View>
      </View>

      {!setupOk ? (
        <Banner
          tone="warning"
          title={t('today.setupBannerTitle')}
          body={t('today.setupBannerBody')}
          action={<Button label={t('today.setupBannerAction')} compact variant="secondary" onPress={() => router.push('/settings/reminders')} />}
        />
      ) : null}

      {lowStock.length > 0 ? (
        <Banner
          tone="warning"
          icon="cart"
          title={t('today.refillBannerTitle')}
          body={t('today.refillBannerBody', { names: lowStock.map((m) => m.name).join(', ') })}
        />
      ) : null}

      {data.medicines.length === 0 ? (
        <Card>
          <EmptyState
            icon="medkit"
            title={t('today.emptyTitle')}
            body={t('today.emptyBody')}
            action={<Button testID="add-first" label={t('today.addFirst')} icon="add" onPress={() => router.push('/medicine/add')} />}
          />
        </Card>
      ) : (
        <>
          <Card tone="primary" style={styles.summary}>
            <ProgressRing
              progress={summary.total ? summary.taken / summary.total : 0}
              color={c.accent}
              track="rgba(255,255,255,0.25)">
              <AppText variant="title" tone="onPrimary">
                {summary.taken}/{summary.total}
              </AppText>
            </ProgressRing>
            <View style={styles.flex}>
              <AppText variant="subtitle" tone="onPrimary">
                {summary.total === 0
                  ? t('today.nothingScheduled')
                  : summary.pending === 0
                    ? t('today.allDone')
                    : t('today.progress', { taken: summary.taken, total: summary.total })}
              </AppText>
              {summary.pending > 0 ? (
                <AppText tone="onPrimary">{t('today.remaining', { count: summary.pending })}</AppText>
              ) : null}
              {summary.missed > 0 ? (
                <View style={[styles.missedPill, { backgroundColor: c.dangerSoft }]}>
                  <Ionicons name="alert-circle" size={16} color={c.danger} />
                  <AppText variant="caption" tone="danger">
                    {summary.missed} {t('status.missed')}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Card>

          {PERIODS.map((p) => {
            const list = doses.filter((d) => periodOf(istMinutesOfDay(d.scheduledAt)) === p);
            if (list.length === 0) return null;
            return (
              <View key={p} style={styles.group}>
                <SectionTitle>{t(`periods.${p}`)}</SectionTitle>
                {list.map((d) => {
                  const m = byId.get(d.medicineId);
                  if (!m) return null;
                  return (
                    <DoseCard
                      key={d.key}
                      dose={d}
                      medicine={m}
                      onTaken={() => record(d, 'taken')}
                      onSkip={() => record(d, 'skipped')}
                      onUndo={() => record(d, 'cleared')}
                    />
                  );
                })}
              </View>
            );
          })}

          {asNeeded.length > 0 ? (
            <View style={styles.group}>
              <SectionTitle>{t('medicines.asNeeded')}</SectionTitle>
              {asNeeded.map((m) => (
                <Card key={m.id}>
                  <View style={styles.row}>
                    <PillIcon form={m.form} color={m.color} size={44} />
                    <AppText variant="bodyStrong" style={styles.flex}>
                      {[m.name, m.strength].filter(Boolean).join(' ')}
                    </AppText>
                  </View>
                  <Button label={t('detail.logNow')} variant="soft" icon="add-circle" onPress={() => logAsNeeded(m)} />
                </Card>
              ))}
            </View>
          ) : null}

          <Button label={t('medicines.add')} icon="add" variant="secondary" onPress={() => router.push('/medicine/add')} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  missedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
