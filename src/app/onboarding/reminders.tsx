import { useTranslation } from 'react-i18next';

import { ReminderSetup } from '@/features/setup/ReminderSetup';
import { useAppState } from '@/state/app-state';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { StepDots } from '@/ui/StepDots';

export default function RemindersStep() {
  const { t } = useTranslation();
  const { finishOnboarding } = useAppState();
  return (
    <Screen
      back
      backLabel={t('common.back')}
      footer={
        <>
          <Button testID="finish-onboarding" label={t('setup.finish')} icon="arrow-forward" onPress={finishOnboarding} />
          <Button label={t('setup.skip')} variant="ghost" onPress={finishOnboarding} />
        </>
      }>
      <StepDots step={4} total={4} />
      <AppText variant="title" accessibilityRole="header">
        {t('setup.title')}
      </AppText>
      <AppText tone="muted">{t('setup.subtitle')}</AppText>
      <ReminderSetup />
    </Screen>
  );
}
