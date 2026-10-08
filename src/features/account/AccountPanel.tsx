import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { currentSession, sendCode, signOut, verifyCode, type AuthError, type Session } from '@/features/account/auth';
import { formatIndianMobile, normalizeIndianMobile } from '@/features/account/phone';
import { isServerConfigured } from '@/features/account/supabase';
import { useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Banner, Card, TextField } from '@/ui/components';
import { spacing } from '@/ui/theme';

/** Optional phone sign-in (one-time SMS code). Used in Settings and as a skippable onboarding step. */
export function AccountPanel({ onSignedIn }: { onSignedIn?: () => void }) {
  const { t } = useTranslation();
  const { repos, profileId, changed } = useServices();
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    currentSession()
      .then(setSession)
      .catch(() => setSession(null));
  }, []);
  useEffect(refresh, [refresh]);

  const errorText = (e: AuthError) =>
    e === 'not_configured' ? t('account.notConfigured') : e === 'invalid_code' ? t('account.codeInvalid') : e === 'offline' ? t('account.offline') : t('errors.generic');

  if (!isServerConfigured) return <Banner tone="info" title={t('account.notConfigured')} />;
  if (session === undefined) return null;

  if (session) {
    return (
      <Card>
        <AppText variant="subtitle">{t('account.signedInAs', { phone: formatIndianMobile(session.phone) })}</AppText>
        <Button
          label={t('account.signOut')}
          variant="secondary"
          icon="log-out-outline"
          onPress={async () => {
            await signOut();
            refresh();
            changed();
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      {!sentTo ? (
        <View style={{ gap: spacing.md }}>
          <TextField
            label={t('account.phone')}
            placeholder={t('account.phonePlaceholder')}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError(null);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            error={error}
          />
          <Button
            label={t('account.sendCode')}
            icon="chatbox-ellipses-outline"
            loading={busy}
            onPress={async () => {
              const e164 = normalizeIndianMobile(phone);
              if (!e164) {
                setError(t('account.phoneInvalid'));
                return;
              }
              setBusy(true);
              const err = await sendCode(e164);
              setBusy(false);
              if (err) setError(errorText(err));
              else setSentTo(e164);
            }}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <AppText>{t('account.codeSent', { phone: formatIndianMobile(sentTo) })}</AppText>
          <TextField
            label={t('account.code')}
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            error={error}
          />
          <Button
            label={t('account.verify')}
            icon="checkmark-circle"
            loading={busy}
            disabled={code.length < 6}
            onPress={async () => {
              setBusy(true);
              const name = (await repos.profiles.get(profileId))?.name ?? '';
              const err = await verifyCode(sentTo, code, name);
              setBusy(false);
              if (err) {
                setError(errorText(err));
                return;
              }
              refresh();
              changed();
              onSignedIn?.();
            }}
          />
          <Button label={t('common.back')} variant="ghost" onPress={() => setSentTo(null)} />
        </View>
      )}
    </Card>
  );
}
