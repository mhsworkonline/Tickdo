import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { clock } from '@/domain/clock';
import { daysRemaining, needsRefill } from '@/domain/refill';
import { istDateKey } from '@/domain/time';
import { MedicineSummary, medicineTitle } from '@/features/medicines/MedicineSummary';
import { SourceText } from '@/features/medicines/MedicineEditor';
import { useLoad, useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Banner, Card, SectionTitle, TextField } from '@/ui/components';
import { formatLongDate } from '@/ui/dates';
import { formatQuantity } from '@/ui/format';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

export default function MedicineDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos, changed } = useServices();
  const medicine = useLoad((s) => s.repos.medicines.get(id), [id]);
  const [stock, setStock] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  if (!medicine) return <Screen back>{null}</Screen>;
  const days = daysRemaining(medicine);

  const saveStock = async () => {
    const n = Number((stock ?? '').replace(',', '.'));
    if (stock !== null && stock.trim() !== '' && Number.isFinite(n) && n >= 0) {
      await repos.medicines.setUnitsOnHand(id, n);
    } else if (stock !== null && stock.trim() === '') {
      await repos.medicines.setUnitsOnHand(id, null);
    }
    setStock(null);
    changed();
  };

  const toggleActive = () => {
    if (!medicine.active) {
      repos.medicines.setActive(id, true).then(changed);
      return;
    }
    Alert.alert(medicineTitle(medicine), t('detail.stopConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('detail.stop'),
        style: 'destructive',
        onPress: () => {
          repos.medicines.setActive(id, false).then(changed);
        },
      },
    ]);
  };

  return (
    <Screen back backLabel={t('common.back')} title={medicineTitle(medicine)}>
      <Card>
        <MedicineSummary medicine={medicine} />
      </Card>

      {needsRefill(medicine) ? <Banner tone="warning" icon="cart" title={t('detail.refillSoon')} /> : null}

      {medicine.frequency === 'as_needed' && medicine.active ? (
        <Button
          label={logged ? t('detail.logged') : t('detail.logNow')}
          icon={logged ? 'checkmark' : 'add-circle'}
          variant="soft"
          onPress={async () => {
            await repos.doses.record({ medicineId: id, scheduledAt: clock.now(), kind: 'taken', via: 'app', quantity: 1 });
            setLogged(true);
            changed();
          }}
        />
      ) : null}

      <SectionTitle>{t('detail.stock')}</SectionTitle>
      <Card>
        <AppText variant="subtitle">
          {medicine.unitsOnHand === null
            ? t('detail.stockUnknown')
            : days !== null
              ? `${formatQuantity(medicine.unitsOnHand)} · ${t('medicines.daysLeft', { count: days })}`
              : t('medicines.unitsLeft', { units: formatQuantity(medicine.unitsOnHand) })}
        </AppText>
        {stock === null ? (
          <Button label={t('detail.updateStock')} variant="secondary" icon="cube-outline" onPress={() => setStock(medicine.unitsOnHand === null ? '' : String(medicine.unitsOnHand))} />
        ) : (
          <View style={styles.gap}>
            <TextField
              label={t('form.stock')}
              helper={t('form.stockHelp')}
              value={stock}
              onChangeText={setStock}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Button label={t('common.save')} onPress={saveStock} />
          </View>
        )}
      </Card>

      <SectionTitle>{t('detail.source')}</SectionTitle>
      <Card>
        <AppText>
          {medicine.source === 'scan' && medicine.scanConfirmedAt
            ? t('detail.sourceScan', { date: formatLongDate(istDateKey(medicine.scanConfirmedAt), t) })
            : t('detail.sourceManual')}
        </AppText>
        {medicine.scanSourceText ? <SourceText text={medicine.scanSourceText} /> : null}
      </Card>

      <View style={styles.gap}>
        <Button
          label={t('common.edit')}
          icon="create-outline"
          onPress={() => router.push({ pathname: '/medicine/[id]/edit', params: { id } })}
        />
        <Button
          label={medicine.active ? t('detail.stop') : t('detail.restart')}
          variant={medicine.active ? 'danger' : 'secondary'}
          icon={medicine.active ? 'pause-circle-outline' : 'play-circle-outline'}
          onPress={toggleActive}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
});
