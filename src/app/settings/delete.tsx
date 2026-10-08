import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { deleteAllData, type DeleteReport } from '@/features/account/delete-all';
import { useAppState } from '@/state/app-state';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Banner, Card, TextField } from '@/ui/components';
import { Screen } from '@/ui/Screen';

export default function DeleteAllData() {
  const { t } = useTranslation();
  const { reset } = useAppState();
  const [typed, setTyped] = useState('');
  const [working, setWorking] = useState(false);
  const [report, setReport] = useState<DeleteReport | null>(null);
  const confirmed = typed.trim().toUpperCase() === t('delete.confirmWord').toUpperCase();

  if (report) {
    return (
      <Screen title={t('delete.title')} footer={<Button label={t('common.done')} onPress={reset} />}>
        <Banner tone={report.local ? 'info' : 'danger'} icon={report.local ? 'checkmark-circle' : 'warning'} title={report.local ? t('delete.localDone') : t('errors.generic')} />
        <Banner
          tone={report.server === 'failed' ? 'danger' : 'info'}
          icon={report.server === 'failed' ? 'cloud-offline' : 'cloud-done'}
          title={report.server === 'done' ? t('delete.serverDone') : report.server === 'skipped' ? t('delete.serverSkipped') : t('delete.serverFailed')}
        />
        {report.local && report.server !== 'failed' ? <AppText variant="subtitle">{t('delete.finished')}</AppText> : null}
      </Screen>
    );
  }

  return (
    <Screen
      back
      backLabel={t('common.back')}
      title={t('delete.title')}
      footer={
        <Button
          testID="delete-everything"
          label={working ? t('delete.working') : t('delete.action')}
          variant="danger"
          icon="trash"
          disabled={!confirmed}
          loading={working}
          onPress={async () => {
            setWorking(true);
            try {
              setReport(await deleteAllData());
            } finally {
              setWorking(false);
            }
          }}
        />
      }>
      <Card>
        <AppText>{t('delete.body')}</AppText>
      </Card>
      <TextField label={t('delete.typeToConfirm')} value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
    </Screen>
  );
}
