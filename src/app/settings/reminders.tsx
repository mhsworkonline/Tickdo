import { useTranslation } from 'react-i18next';

import { ReminderSetup } from '@/features/setup/ReminderSetup';
import { Screen } from '@/ui/Screen';

export default function ReminderSetupScreen() {
  const { t } = useTranslation();
  return (
    <Screen back backLabel={t('common.back')} title={t('setup.title')} subtitle={t('setup.subtitle')}>
      <ReminderSetup />
    </Screen>
  );
}
