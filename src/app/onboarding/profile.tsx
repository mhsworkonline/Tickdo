import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/components';
import { Screen } from '@/ui/Screen';
import { StepDots } from '@/ui/StepDots';

export default function ProfileStep() {
  const { t } = useTranslation();
  const { repos, profileId, changed } = useServices();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const next = async () => {
    if (!name.trim()) {
      setError(t('onboarding.profile.nameRequired'));
      return;
    }
    await repos.profiles.rename(profileId, name.trim());
    changed();
    router.push('/onboarding/reminders');
  };

  return (
    <Screen back backLabel={t('common.back')} footer={<Button testID="profile-next" label={t('common.continue')} onPress={next} />}>
      <StepDots step={3} total={4} />
      <AppText variant="title" accessibilityRole="header">
        {t('onboarding.profile.title')}
      </AppText>
      <AppText tone="muted">{t('onboarding.profile.subtitle')}</AppText>
      <TextField
        testID="profile-name"
        label={t('onboarding.profile.nameLabel')}
        placeholder={t('onboarding.profile.namePlaceholder')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        error={error}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={next}
        maxLength={40}
      />
    </Screen>
  );
}
