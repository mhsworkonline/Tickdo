import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { canUseCaregiverSharing } from '@/domain/entitlements';
import { currentSession, type Session } from '@/features/account/auth';
import { formatIndianMobile, normalizeIndianMobile } from '@/features/account/phone';
import { isServerConfigured } from '@/features/account/supabase';
import {
  caringFor,
  incomingInvites,
  inviteCaregiver,
  leaveCaregiving,
  myLink,
  respondToInvite,
  stopSharing,
  type CaredFor,
  type Invite,
  type Link,
} from '@/features/caregiver/api';
import { useServices } from '@/services/AppServices';
import { runMaintenance } from '@/services/maintenance';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Badge, Banner, Card, Divider, ListRow, SectionTitle, TextField } from '@/ui/components';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

type State = { session: Session; link: Link | null; invites: Invite[]; caring: CaredFor[] };

export default function CaregiverScreen() {
  const { t } = useTranslation();
  const { plan } = useServices();
  const [state, setState] = useState<State | null>(null);
  const [failed, setFailed] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const session = await currentSession();
      if (!session) {
        setState({ session: null, link: null, invites: [], caring: [] });
        return;
      }
      const [link, invites, caring] = await Promise.all([myLink(), incomingInvites(), caringFor()]);
      setState({ session, link, invites, caring });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const name = (n: string) => n || t('caregiver.unnamed');

  return (
    <Screen back backLabel={t('common.back')} title={t('caregiver.title')}>
      <AppText tone="muted">{t('caregiver.intro')}</AppText>
      <Banner tone="info" icon="eye-outline" title={t('caregiver.whatIsShared')} />

      {!isServerConfigured ? <Banner tone="info" title={t('account.notConfigured')} /> : null}
      {failed ? <Banner tone="danger" icon="cloud-offline" title={t('caregiver.offline')} action={<Button label={t('common.retry')} compact variant="secondary" onPress={load} />} /> : null}

      {state && !state.session ? (
        <Card>
          <AppText>{t('caregiver.needsAccount')}</AppText>
          <Button label={t('account.title')} icon="person-circle" onPress={() => router.push('/settings/account')} />
        </Card>
      ) : null}

      {state?.session ? (
        <>
          {/* People who invited me / whom I care for — free for caregivers. */}
          {state.invites.map((inv) => (
            <Card key={inv.id}>
              <AppText variant="subtitle">{t('caregiver.inviteFrom', { name: name(inv.patientName) })}</AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('caregiver.acceptInvite')}
                    icon="checkmark"
                    onPress={async () => {
                      await respondToInvite(inv.id, true);
                      load();
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('caregiver.declineInvite')}
                    variant="secondary"
                    onPress={async () => {
                      await respondToInvite(inv.id, false);
                      load();
                    }}
                  />
                </View>
              </View>
            </Card>
          ))}

          {state.caring.length > 0 ? (
            <>
              <SectionTitle>{t('caregiver.sharedWithMe')}</SectionTitle>
              <Card>
                {state.caring.map((p, i) => (
                  <View key={p.linkId}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      icon="heart"
                      title={name(p.patientName)}
                      subtitle={t('caregiver.viewLog')}
                      onPress={() => router.push({ pathname: '/caregiver/[patientId]', params: { patientId: p.patientId, name: p.patientName } })}
                    />
                    <Button
                      label={t('caregiver.leave')}
                      variant="ghost"
                      compact
                      onPress={() =>
                        Alert.alert(name(p.patientName), t('caregiver.leaveConfirm'), [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('caregiver.leave'),
                            style: 'destructive',
                            onPress: async () => {
                              await leaveCaregiving(p.linkId);
                              load();
                            },
                          },
                        ])
                      }
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {/* My own caregiver — Tickdo Plus. */}
          <SectionTitle>{t('caregiver.title')}</SectionTitle>
          {!canUseCaregiverSharing(plan) ? (
            <Card>
              <AppText>{t('caregiver.needsPlus')}</AppText>
              <Button label={t('plus.title')} icon="star" onPress={() => router.push('/settings/plus')} />
            </Card>
          ) : state.link ? (
            <Card>
              <AppText variant="subtitle">
                {state.link.status === 'accepted'
                  ? t('caregiver.accepted', { phone: formatIndianMobile(state.link.caregiverPhone) })
                  : t('caregiver.invited', { phone: formatIndianMobile(state.link.caregiverPhone) })}
              </AppText>
              {state.link.status === 'pending' ? <Badge tone="warning" icon="time" label={t('caregiver.invitePending')} /> : null}
              <Button
                label={t('caregiver.remove')}
                variant="danger"
                icon="close-circle"
                onPress={() =>
                  Alert.alert(t('caregiver.remove'), t('caregiver.removeConfirm'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('caregiver.remove'),
                      style: 'destructive',
                      onPress: async () => {
                        if (state.link) await stopSharing(state.link.id);
                        load();
                      },
                    },
                  ])
                }
              />
            </Card>
          ) : (
            <Card>
              <TextField
                label={t('caregiver.invitePhone')}
                placeholder={t('account.phonePlaceholder')}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setError(null);
                }}
                keyboardType="phone-pad"
                error={error}
              />
              <Button
                label={t('caregiver.invite')}
                icon="send"
                loading={busy}
                onPress={async () => {
                  const e164 = normalizeIndianMobile(phone);
                  if (!e164) {
                    setError(t('account.phoneInvalid'));
                    return;
                  }
                  setBusy(true);
                  const ok = await inviteCaregiver(e164);
                  setBusy(false);
                  if (!ok) setError(t('errors.generic'));
                  else {
                    setPhone('');
                    load();
                    runMaintenance().catch(() => undefined);
                  }
                }}
              />
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}
