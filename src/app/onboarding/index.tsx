import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, type Language } from '@/i18n';
import { useAppState } from '@/state/app-state';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';

export default function LanguageStep() {
  const { t } = useTranslation();
  const { language, setLanguage } = useAppState();

  const choose = async (lang: Language) => {
    await setLanguage(lang);
    router.push('/onboarding/disclaimer');
  };

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {t('onboarding.language.title')}
      </AppText>
      <AppText muted>{t('onboarding.language.subtitle')}</AppText>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <Button
          key={lang}
          testID={`language-${lang}`}
          label={t(`languages.${lang}`)}
          variant={language === lang ? 'primary' : 'secondary'}
          onPress={() => choose(lang)}
        />
      ))}
    </Screen>
  );
}
