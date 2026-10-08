import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { clock } from '@/domain/clock';
import { canAddMedicine } from '@/domain/entitlements';
import { istDateKey } from '@/domain/time';
import { emptyDraft } from '@/features/medicines/draft';
import { MedicineEditor } from '@/features/medicines/MedicineEditor';
import { useServices } from '@/services/AppServices';

export default function NewMedicine() {
  const { t } = useTranslation();
  const { repos, profileId, changed, plan } = useServices();
  const [initial] = useState(() => emptyDraft(istDateKey(clock.now())));
  return (
    <MedicineEditor
      title={t('form.titleNew')}
      initial={initial}
      onConfirm={async (input) => {
        if (!canAddMedicine(plan, await repos.medicines.countActive(profileId))) {
          router.replace('/settings/plus');
          return;
        }
        await repos.medicines.create(profileId, input);
        changed();
        router.dismissTo('/medicines');
      }}
    />
  );
}
