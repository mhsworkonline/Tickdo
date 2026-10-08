import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { draftFromMedicine } from '@/features/medicines/draft';
import { MedicineEditor } from '@/features/medicines/MedicineEditor';
import { useLoad, useServices } from '@/services/AppServices';
import { Screen } from '@/ui/Screen';

export default function EditMedicine() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos, changed } = useServices();
  const medicine = useLoad((s) => s.repos.medicines.get(id), [id]);
  if (!medicine) return <Screen back>{null}</Screen>;
  return (
    <MedicineEditor
      title={t('form.titleEdit')}
      initial={draftFromMedicine(medicine)}
      sourceText={medicine.scanSourceText}
      onConfirm={async (input) => {
        // Editing keeps the medicine's source (manual / scan) and its scan record.
        await repos.medicines.update(id, input);
        changed();
        router.back();
      }}
    />
  );
}
