import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { canAddMedicine, FREE_MEDICINE_LIMIT } from '@/domain/entitlements';
import { MedicineSummary, medicineTitle } from '@/features/medicines/MedicineSummary';
import { useLoad, useServices } from '@/services/AppServices';
import { Button } from '@/ui/Button';
import { Banner, Card, EmptyState, PressableCard, SectionTitle } from '@/ui/components';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

export default function MedicinesScreen() {
  const { t } = useTranslation();
  const { plan } = useServices();
  const [showStopped, setShowStopped] = useState(false);
  const meds = useLoad((s) => s.repos.medicines.list(s.profileId, { includeInactive: true }));
  if (!meds) return <Screen title={t('medicines.title')}>{null}</Screen>;

  const active = meds.filter((m) => m.active);
  const stopped = meds.filter((m) => !m.active);
  const atLimit = !canAddMedicine(plan, active.length);

  const addButton = (
    <Button
      testID="add-medicine"
      label={t('medicines.add')}
      icon="add"
      onPress={() => router.push(atLimit ? '/settings/plus' : '/medicine/add')}
    />
  );

  return (
    <Screen title={t('medicines.title')}>
      {atLimit ? (
        <Banner
          tone="info"
          icon="star"
          title={t('medicines.limitTitle', { limit: FREE_MEDICINE_LIMIT })}
          body={t('medicines.limitBody')}
        />
      ) : null}

      {active.length === 0 ? (
        <Card>
          <EmptyState icon="medical" title={t('medicines.emptyTitle')} body={t('medicines.emptyBody')} action={addButton} />
        </Card>
      ) : (
        <>
          {addButton}
          <View style={{ gap: spacing.sm }}>
            {active.map((m) => (
              <PressableCard
                key={m.id}
                accessibilityLabel={medicineTitle(m)}
                onPress={() => router.push({ pathname: '/medicine/[id]', params: { id: m.id } })}>
                <MedicineSummary medicine={m} />
              </PressableCard>
            ))}
          </View>
        </>
      )}

      {stopped.length > 0 ? (
        <>
          <Button
            label={`${t('medicines.showStopped')} (${stopped.length})`}
            variant="ghost"
            icon={showStopped ? 'chevron-up' : 'chevron-down'}
            onPress={() => setShowStopped((v) => !v)}
          />
          {showStopped ? (
            <View style={{ gap: spacing.sm }}>
              <SectionTitle>{t('medicines.stopped')}</SectionTitle>
              {stopped.map((m) => (
                <PressableCard
                  key={m.id}
                  accessibilityLabel={medicineTitle(m)}
                  onPress={() => router.push({ pathname: '/medicine/[id]', params: { id: m.id } })}>
                  <MedicineSummary medicine={m} />
                </PressableCard>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
