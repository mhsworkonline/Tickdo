import { useTranslation } from 'react-i18next';

import { AccountPanel } from '@/features/account/AccountPanel';
import { AppText } from '@/ui/AppText';
import { Screen } from '@/ui/Screen';

export default function AccountScreen() {
  const { t } = useTranslation();
  return (
    <Screen back backLabel={t('common.back')} title={t('account.title')}>
      <AppText tone="muted">{t('account.intro')}</AppText>
      <AccountPanel />
    </Screen>
  );
}
