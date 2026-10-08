import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AccountPanel } from '@/features/account/AccountPanel';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { StepDots } from '@/ui/StepDots';

/** Optional: reminders work without an account. */
export default function AccountStep() {
  const { t } = useTranslation();
  const next = () => router.push('/onboarding/reminders');
  return (
    <Screen back backLabel={t('common.back')} footer={<Button testID="skip-account" label={t('common.notNow')} variant="secondary" onPress={next} />}>
      <StepDots step={4} total={5} />
      <AppText variant="title" accessibilityRole="header">
        {t('account.title')}
      </AppText>
      <AppText tone="muted">{t('account.intro')}</AppText>
      <AccountPanel onSignedIn={next} />
    </Screen>
  );
}
