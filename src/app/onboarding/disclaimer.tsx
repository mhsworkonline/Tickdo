import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppState } from '@/state/app-state';
import { Button } from '@/ui/Button';
import { Disclaimer } from '@/ui/Disclaimer';
import { Screen } from '@/ui/Screen';
import { StepDots } from '@/ui/StepDots';

export default function DisclaimerStep() {
  const { t } = useTranslation();
  const { acceptDisclaimer } = useAppState();

  return (
    <Screen
      back
      backLabel={t('common.back')}
      footer={
        <Button
          testID="accept-disclaimer"
          label={t('onboarding.disclaimer.accept')}
          accessibilityHint={t('onboarding.disclaimer.acceptHint')}
          icon="checkmark-circle"
          onPress={async () => {
            await acceptDisclaimer();
            router.push('/onboarding/profile');
          }}
        />
      }>
      <StepDots step={2} total={4} />
      <Disclaimer />
    </Screen>
  );
}
