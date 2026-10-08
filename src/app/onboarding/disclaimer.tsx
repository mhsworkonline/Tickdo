import { useTranslation } from 'react-i18next';

import { useAppState } from '@/state/app-state';
import { Button } from '@/ui/Button';
import { Disclaimer } from '@/ui/Disclaimer';
import { Screen } from '@/ui/Screen';

export default function DisclaimerStep() {
  const { t } = useTranslation();
  const { acceptDisclaimer } = useAppState();

  // Optional phone sign-in and profile setup are inserted after this step in Deliverable 6.
  return (
    <Screen>
      <Disclaimer />
      <Button
        testID="accept-disclaimer"
        label={t('onboarding.disclaimer.accept')}
        accessibilityHint={t('onboarding.disclaimer.acceptHint')}
        onPress={acceptDisclaimer}
      />
    </Screen>
  );
}
