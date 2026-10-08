import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/ui/Placeholder';

// Medicine list + add (manual / scan): Deliverables 3 and 5.
export default function MedicinesScreen() {
  const { t } = useTranslation();
  return <Placeholder title={t('medicines.title')} />;
}
