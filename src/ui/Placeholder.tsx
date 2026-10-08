import { useTranslation } from 'react-i18next';

import { AppText } from '@/ui/AppText';
import { Screen } from '@/ui/Screen';

/** Temporary screen body for tabs whose feature lands in a later deliverable. */
export function Placeholder({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <AppText muted>{t('common.notYetAvailable')}</AppText>
    </Screen>
  );
}
