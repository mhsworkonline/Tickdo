import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import * as Native from 'tickdo-native';

import { BRAND_LABEL } from '@/features/setup/brand';
import { getSetupStatus, requestNotificationPermission, type SetupStatus } from '@/features/setup/status';
import { useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Badge, Card } from '@/ui/components';
import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

/** The three steps that make reminders reliable. Re-checks when the user returns from Settings. */
export function ReminderSetup() {
  const { t } = useTranslation();
  const { changed } = useServices();
  const [status, setStatus] = useState<SetupStatus | null>(null);

  const refresh = useCallback(() => {
    getSetupStatus().then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refresh();
        changed();
      }
    });
    return () => sub.remove();
  }, [refresh, changed]);

  if (!status) return null;
  const isAndroid = Platform.OS === 'android';
  const steps = (t(`battery.${status.brand}`, { returnObjects: true }) as unknown as string[]) ?? [];

  return (
    <View style={styles.list}>
      <Step
        n={1}
        done={status.notifications}
        required
        title={t('setup.notifTitle')}
        body={t('setup.notifBody')}
        action={
          <Button
            label={t('setup.notifAction')}
            icon="notifications"
            onPress={async () => {
              await requestNotificationPermission();
              refresh();
              changed();
            }}
          />
        }
      />
      {isAndroid ? (
        <Step
          n={2}
          done={status.exactAlarms}
          required
          title={t('setup.exactTitle')}
          body={t('setup.exactBody')}
          action={<Button label={t('setup.exactAction')} icon="alarm" onPress={() => Native.openExactAlarmSettings()} />}
        />
      ) : null}
      {isAndroid ? (
        <Step
          n={3}
          done={status.battery}
          title={t('setup.batteryTitle')}
          body={t('setup.batteryBody')}
          action={
            <View style={styles.list}>
              <AppText variant="bodyStrong">{t('setup.guideTitle', { brand: BRAND_LABEL[status.brand] })}</AppText>
              {steps.map((s, i) => (
                <View key={s} style={styles.bulletRow}>
                  <AppText tone="primary" variant="bodyStrong">
                    {i + 1}.
                  </AppText>
                  <AppText style={styles.flex}>{s}</AppText>
                </View>
              ))}
              <Button
                label={t('setup.batteryAction')}
                icon="battery-charging"
                variant="secondary"
                onPress={() => Native.openBatteryOptimizationSettings()}
              />
              {status.brand !== 'generic' ? (
                <Button
                  label={t('setup.autostartAction')}
                  icon="rocket"
                  variant="secondary"
                  onPress={() => {
                    if (!Native.openAutostartSettings()) Native.openAppSettings();
                  }}
                />
              ) : null}
            </View>
          }
        />
      ) : null}
    </View>
  );
}

function Step({
  n,
  done,
  required = false,
  title,
  body,
  action,
}: {
  n: number;
  done: boolean;
  required?: boolean;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <Card>
      <View style={styles.stepHead}>
        <View style={[styles.num, { backgroundColor: done ? c.successSoft : c.primarySoft }]}>
          {done ? (
            <Ionicons name="checkmark" size={24} color={c.success} />
          ) : (
            <AppText variant="subtitle" tone="primary">
              {n}
            </AppText>
          )}
        </View>
        <View style={styles.flex}>
          <AppText variant="subtitle">{title}</AppText>
          <Badge
            label={done ? t('setup.done') : required ? t('setup.needed') : t('setup.recommended')}
            tone={done ? 'success' : required ? 'danger' : 'warning'}
          />
        </View>
      </View>
      {!done ? (
        <>
          <AppText>{body}</AppText>
          {action}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
  stepHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  num: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
});
