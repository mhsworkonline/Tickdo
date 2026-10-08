import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { clock } from '@/domain/clock';
import { canAddMedicine, FREE_MEDICINE_LIMIT } from '@/domain/entitlements';
import { istDateKey } from '@/domain/time';
import { MedicineEditor } from '@/features/medicines/MedicineEditor';
import { candidateToDraft, wasEdited } from '@/features/scan/candidate-draft';
import { SCAN_ACCURACY_GATE_PASSED } from '@/features/scan/config';
import { updateItem, useScanSession } from '@/features/scan/session';
import { useServices } from '@/services/AppServices';
import { Banner } from '@/ui/components';
import { Screen } from '@/ui/Screen';

/**
 * Confirms one scanned medicine. The user always sets the reminder times here (scans never
 * provide them) and sees the prescription text next to the fields. Saving stores the source
 * text and confirmation time with the medicine.
 */
export default function ConfirmScanned() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string; mode?: string }>();
  const session = useScanSession();
  const { repos, profileId, plan, changed } = useServices();
  const candidate = session?.result.candidates.find((c) => c.id === id) ?? null;
  const [initial] = useState(() => (candidate ? candidateToDraft(candidate, istDateKey(clock.now())) : null));
  const [limitHit, setLimitHit] = useState(false);

  if (!session || !candidate || !initial) return <Screen back>{null}</Screen>;

  return (
    <MedicineEditor
      title={t('scan.reviewTitle')}
      initial={initial}
      sourceText={candidate.sourceText}
      notice={
        <>
          {!SCAN_ACCURACY_GATE_PASSED ? <Banner tone="warning" title={t('scan.warningTitle')} body={t('scan.warningBody')} /> : null}
          {limitHit ? <Banner tone="info" icon="star" title={t('scan.limitReached', { limit: FREE_MEDICINE_LIMIT })} /> : null}
        </>
      }
      onConfirm={async (input) => {
        if (!canAddMedicine(plan, await repos.medicines.countActive(profileId))) {
          setLimitHit(true);
          router.push('/settings/plus');
          return;
        }
        await repos.medicines.create(profileId, input, { scanId: session.scanId, sourceText: candidate.sourceText });
        updateItem(candidate.id, { status: 'confirmed', edited: wasEdited(initial, input) });
        changed();
        router.back();
      }}
    />
  );
}
