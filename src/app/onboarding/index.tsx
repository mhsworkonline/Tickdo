import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SUPPORTED_LANGUAGES, type Language } from '@/i18n';
import { useAppState } from '@/state/app-state';
import { AppText } from '@/ui/AppText';
import { PressableCard } from '@/ui/components';
import { Screen } from '@/ui/Screen';
import { StepDots } from '@/ui/StepDots';
import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

const LANG_SAMPLE: Record<Language, string> = { en: 'Aa', hi: 'अ' };

export default function LanguageStep() {
  const { t } = useTranslation();
  const c = useColors();
  const { language, setLanguage } = useAppState();

  const choose = async (lang: Language) => {
    await setLanguage(lang);
    router.push('/onboarding/disclaimer');
  };

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <View style={[styles.logo, { backgroundColor: c.accent }]}>
          <Ionicons name="checkmark-done" size={44} color="#3A2200" />
        </View>
        <AppText variant="display" tone="onPrimary">
          {t('app.name')}
        </AppText>
        <AppText tone="onPrimary">{t('onboarding.welcomeBody')}</AppText>
      </View>
      <StepDots step={1} total={4} />
      <AppText variant="title" accessibilityRole="header">
        {t('onboarding.language.title')}
      </AppText>
      <AppText tone="muted">{t('onboarding.language.subtitle')}</AppText>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const selected = language === lang;
        return (
          <PressableCard
            key={lang}
            testID={`language-${lang}`}
            accessibilityLabel={t(`languages.${lang}`)}
            onPress={() => choose(lang)}
            style={selected ? { borderColor: c.primary, borderWidth: 2 } : undefined}>
            <View style={styles.langRow}>
              <View style={[styles.sample, { backgroundColor: c.primarySoft }]}>
                <AppText variant="title" tone="primary">
                  {LANG_SAMPLE[lang]}
                </AppText>
              </View>
              <AppText variant="subtitle" style={styles.flex}>
                {t(`languages.${lang}`)}
              </AppText>
              <Ionicons name="chevron-forward" size={24} color={c.textMuted} />
            </View>
          </PressableCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  logo: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sample: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
