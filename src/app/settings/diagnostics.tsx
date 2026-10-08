import * as BackgroundTask from 'expo-background-task';
import { Asset } from 'expo-asset';
import * as Native from 'tickdo-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { format12h, istDateKey, istMinutesOfDay } from '@/domain/time';
import { KV_LAST_SYNC, scheduledReminderCount } from '@/features/notifications/reminders';
import { getSetupStatus, type SetupStatus } from '@/features/setup/status';
import { runMaintenance } from '@/services/maintenance';
import { useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Badge, Card, Divider } from '@/ui/components';
import { formatLongDate } from '@/ui/dates';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

type Info = { count: number; lastSync: number | null; status: SetupStatus; background: boolean };

/** Shows how many reminders the phone has scheduled. Contains no medicine names. */
export default function Diagnostics() {
  const { t } = useTranslation();
  const { repos } = useServices();
  const [info, setInfo] = useState<Info | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ocr, setOcr] = useState<string | null>(null);

  const load = async () => {
    const [count, last, status, bg] = await Promise.all([
      scheduledReminderCount(),
      repos.kv.get(KV_LAST_SYNC),
      getSetupStatus(),
      BackgroundTask.getStatusAsync(),
    ]);
    setInfo({ count, lastSync: last ? Number(last) : null, status, background: bg === BackgroundTask.BackgroundTaskStatus.Available });
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!info) return <Screen back title={t('diagnostics.title')}>{null}</Screen>;
  const yesNo = (v: boolean) => <Badge tone={v ? 'success' : 'danger'} label={v ? t('common.yes') : t('common.no')} />;
  const when = (ms: number) => `${formatLongDate(istDateKey(ms), t)}, ${format12h(istMinutesOfDay(ms))}`;

  return (
    <Screen back backLabel={t('common.back')} title={t('diagnostics.title')}>
      <Card tone="primary" style={styles.big}>
        <AppText variant="display" tone="onPrimary" testID="scheduled-count">
          {info.count}
        </AppText>
        <AppText variant="subtitle" tone="onPrimary">
          {t('diagnostics.scheduled')}
        </AppText>
      </Card>
      <Card>
        <Row label={t('diagnostics.lastSync')} value={<AppText variant="bodyStrong">{info.lastSync ? when(info.lastSync) : t('diagnostics.never')}</AppText>} />
        <Divider />
        <Row label={t('diagnostics.notifPermission')} value={yesNo(info.status.notifications)} />
        <Divider />
        <Row label={t('diagnostics.exactAlarms')} value={yesNo(info.status.exactAlarms)} />
        <Divider />
        <Row label={t('diagnostics.battery')} value={yesNo(info.status.battery)} />
        <Divider />
        <Row
          label={t('diagnostics.background')}
          value={<Badge tone={info.background ? 'success' : 'warning'} label={info.background ? t('diagnostics.available') : t('diagnostics.restricted')} />}
        />
        <Divider />
        <Row label={t('diagnostics.manufacturer')} value={<AppText variant="bodyStrong">{info.status.manufacturer || '—'}</AppText>} />
        <Divider />
        <Row label={t('diagnostics.android')} value={<AppText variant="bodyStrong">{info.status.apiLevel ?? '—'}</AppText>} />
      </Card>
      <Card>
        <AppText variant="bodyStrong">{t('diagnostics.ocrTitle')}</AppText>
        <AppText variant="caption" tone="muted">
          {t('diagnostics.ocrBody')}
        </AppText>
        <Button
          label={t('diagnostics.ocrRun')}
          variant="secondary"
          icon="scan"
          compact
          onPress={async () => {
            setOcr(t('scan.reading'));
            try {
              // Synthetic sample image bundled with the app (not a real prescription).
              const [asset] = await Asset.loadAsync(require('../../../assets/samples/ocr-sample.png'));
              const uri = asset?.localUri ?? asset?.uri ?? '';
              const start = Date.now();
              const latin = await Native.recognizeText(uri, 'latin');
              const hindi = await Native.recognizeText(uri, 'devanagari');
              const summary = t('diagnostics.ocrResult', { latin: latin.lines.length, hindi: hindi.lines.length, ms: Date.now() - start });
              const sample = latin.lines.slice(0, 4).map((l) => `• ${l.text}`);
              setOcr([summary, ...sample].join('\n'));
            } catch (e) {
              setOcr(`${t('diagnostics.ocrFailed')} ${e instanceof Error ? e.message : ''}`);
            }
          }}
        />
        {ocr ? <AppText testID="ocr-result">{ocr}</AppText> : null}
      </Card>
      {message ? <AppText tone="success">{message}</AppText> : null}
      <Button
        label={t('diagnostics.resync')}
        icon="refresh"
        onPress={async () => {
          await runMaintenance();
          await load();
          setMessage(t('diagnostics.resynced', { count: await scheduledReminderCount() }));
        }}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.flex}>{label}</AppText>
      {value}
    </View>
  );
}

const styles = StyleSheet.create({
  big: { alignItems: 'center', paddingVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  flex: { flex: 1 },
});
