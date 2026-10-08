import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { sendTestNotification } from '@/features/notifications/reminders';
import { requestNotificationPermission } from '@/features/setup/status';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useLoad, useServices } from '@/services/AppServices';
import { useAppState } from '@/state/app-state';
import { AppText } from '@/ui/AppText';
import { Badge, Banner, Card, ChoiceChips, Divider, ListRow, SectionTitle } from '@/ui/components';
import { Disclaimer } from '@/ui/Disclaimer';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useAppState();
  const { plan } = useServices();
  const [testSent, setTestSent] = useState(false);
  const [privacyMissing, setPrivacyMissing] = useState(false);
  const profile = useLoad((s) => s.repos.profiles.get(s.profileId));

  return (
    <Screen title={t('settings.title')}>
      <Card>
        <ListRow
          icon="star"
          title={plan === 'plus' ? t('plus.activeTitle') : t('plus.title')}
          subtitle={plan === 'plus' ? t('plus.activeBody') : t('plus.short')}
          onPress={() => router.push('/settings/plus')}
          right={plan === 'plus' ? <Badge tone="success" label="Plus" /> : undefined}
        />
        <Divider />
        <ListRow icon="person-circle" title={t('settings.account')} subtitle={t('settings.accountHint')} onPress={() => router.push('/settings/account')} />
        <Divider />
        <ListRow icon="people" title={t('caregiver.title')} subtitle={t('caregiver.short')} onPress={() => router.push('/settings/caregiver')} />
      </Card>

      <SectionTitle>{t('settings.language')}</SectionTitle>
      <Card>
        <ChoiceChips
          label={t('settings.language')}
          options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`languages.${l}`) }))}
          value={language}
          onChange={(l) => setLanguage(l)}
        />
      </Card>

      <SectionTitle>{t('settings.reminders')}</SectionTitle>
      <Card>
        <ListRow icon="alarm" title={t('settings.reminderSetup')} subtitle={t('settings.reminderSetupHint')} onPress={() => router.push('/settings/reminders')} />
        <Divider />
        <ListRow
          icon="notifications"
          title={t('settings.testNotification')}
          subtitle={testSent ? t('settings.testSent') : undefined}
          onPress={async () => {
            if (await requestNotificationPermission()) {
              await sendTestNotification(t);
              setTestSent(true);
            }
          }}
        />
        <Divider />
        <ListRow icon="pulse" title={t('settings.diagnostics')} subtitle={t('settings.diagnosticsHint')} onPress={() => router.push('/settings/diagnostics')} />
        <Divider />
        <ListRow icon="camera" title={t('scanSettings.title')} subtitle={t('scanSettings.short')} onPress={() => router.push('/settings/scanning')} />
      </Card>

      <SectionTitle>{t('settings.data')}</SectionTitle>
      <Card>
        <ListRow icon="person" title={t('settings.profile')} subtitle={profile?.name || '—'} />
        <Divider />
        <ListRow
          icon="shield-checkmark"
          title={t('settings.privacy')}
          onPress={() => {
            if (PRIVACY_URL) WebBrowser.openBrowserAsync(PRIVACY_URL);
            else setPrivacyMissing(true);
          }}
        />
        {privacyMissing ? <Banner tone="info" title={t('settings.privacyMissing')} /> : null}
        <Divider />
        <ListRow icon="trash" title={t('settings.deleteAll')} subtitle={t('settings.deleteAllHint')} onPress={() => router.push('/settings/delete')} />
      </Card>

      <SectionTitle>{t('settings.about')}</SectionTitle>
      <Disclaimer />
      <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
        <AppText variant="caption" tone="muted">
          {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
        </AppText>
      </View>
    </Screen>
  );
}
