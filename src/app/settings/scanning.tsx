import { useTranslation } from 'react-i18next';

import { useScanSettings } from '@/features/scan/settings';
import { AppText } from '@/ui/AppText';
import { Banner, Card, ChoiceChips } from '@/ui/components';
import { Screen } from '@/ui/Screen';

export default function ScanSettings() {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useScanSettings();
  return (
    <Screen back backLabel={t('common.back')} title={t('scanSettings.title')}>
      <Card>
        <AppText>{t('scanSettings.body')}</AppText>
        <ChoiceChips
          label={t('scanSettings.title')}
          options={[
            { value: 'on', label: t('common.on') },
            { value: 'off', label: t('common.off') },
          ]}
          value={enabled ? 'on' : 'off'}
          onChange={(v) => setEnabled(v === 'on')}
        />
      </Card>
      <Banner tone="warning" title={t('scan.warningTitle')} body={t('scan.warningBody')} />
      <Banner tone="info" title={t('scanSettings.privacy')} />
    </Screen>
  );
}
