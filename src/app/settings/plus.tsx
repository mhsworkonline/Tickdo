import { useTranslation } from 'react-i18next';

import { AppText } from '@/ui/AppText';
import { Card } from '@/ui/components';
import { Screen } from '@/ui/Screen';

// Replaced by its full implementation in a later deliverable.
export default function Placeholder() {
  const { t } = useTranslation();
  return (
    <Screen back backLabel={t('common.back')} title={t('plus.title')}>
      <Card>
        <AppText>{t('plus.short')}</AppText>
      </Card>
    </Screen>
  );
}
