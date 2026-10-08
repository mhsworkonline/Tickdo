import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/ui/Placeholder';

// Dose log by day: Deliverable 4.
export default function LogScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('log.title')} />;
}
