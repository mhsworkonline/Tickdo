import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useAppState } from '@/state/app-state';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Disclaimer } from '@/ui/Disclaimer';
import { Screen } from '@/ui/Screen';

// Notification test, delete all data, privacy policy link and diagnostics are added in later deliverables.
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useAppState();
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {t('settings.title')}
      </AppText>

      <AppText variant="subtitle" accessibilityRole="header">
        {t('settings.language')}
      </AppText>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <Button
          key={lang}
          label={t(`languages.${lang}`)}
          variant={language === lang ? 'primary' : 'secondary'}
          onPress={() => setLanguage(lang)}
        />
      ))}

      <AppText variant="subtitle" accessibilityRole="header">
        {t('settings.about')}
      </AppText>
      <Disclaimer />
    </Screen>
  );
}
