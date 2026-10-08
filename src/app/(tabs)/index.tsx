import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/ui/Placeholder';

// Today checklist: Deliverable 3.
export default function TodayScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('today.title')} />;
}
