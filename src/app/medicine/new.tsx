import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { clock } from '@/domain/clock';
import { istDateKey } from '@/domain/time';
import { emptyDraft } from '@/features/medicines/draft';
import { MedicineEditor } from '@/features/medicines/MedicineEditor';
import { useServices } from '@/services/AppServices';

export default function NewMedicine() {
  const { t } = useTranslation();
  const { repos, profileId, changed } = useServices();
  const [initial] = useState(() => emptyDraft(istDateKey(clock.now())));
  return (
    <MedicineEditor
      title={t('form.titleNew')}
      initial={initial}
      onConfirm={async (input) => {
        await repos.medicines.create(profileId, input);
        changed();
        router.dismissTo('/medicines');
      }}
    />
  );
}
