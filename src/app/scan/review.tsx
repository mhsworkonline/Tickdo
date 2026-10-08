import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import type { FrequencyInterpretation } from '@/domain/frequency';
import { catalogDisplayName } from '@/features/catalog/catalog';
import { SourceText } from '@/features/medicines/MedicineEditor';
import { SCAN_ACCURACY_GATE_PASSED } from '@/features/scan/config';
import type { Candidate } from '@/features/scan/parser';
import { deletePhoto } from '@/features/scan/pipeline';
import { exportOcrForStudy, STUDY_MODE } from '@/features/scan/study-export';
import { endSession, getSession, sessionCounts, updateItem, useScanSession, type ItemState } from '@/features/scan/session';
import { useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Badge, Banner, Card, Divider, EmptyState, SectionTitle } from '@/ui/components';
import { formatQuantity } from '@/ui/format';
import { Screen } from '@/ui/Screen';
import { spacing } from '@/ui/theme';

/**
 * One card per recognised medicine: matched name, strength, frequency and times next to the
 * exact text read from the photo, with Confirm / Edit / Remove. There is no "confirm all".
 */
export default function ScanReview() {
  const { t } = useTranslation();
  const { repos } = useServices();
  const session = useScanSession();

  const finish = async () => {
    const s = getSession();
    if (s) {
      const counts = sessionCounts(s);
      deletePhoto(s.photoUri);
      await repos.scans.finish(s.scanId, counts);
      await repos.scans.markPhotoDeleted(s.scanId);
    }
    endSession();
    router.dismissTo('/medicines');
  };

  if (!session) {
    return (
      <Screen back backLabel={t('common.back')} title={t('scan.reviewTitle')}>
        <EmptyState icon="document-text" title={t('scan.nothingFound')} body={t('scan.nothingFoundBody')} />
      </Screen>
    );
  }

  const { candidates, unrecognised } = session.result;
  const counts = sessionCounts(session);
  const confirmed = counts.confirmedEdited + counts.confirmedUnchanged;

  const discard = () =>
    Alert.alert(t('scan.discard'), t('scan.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('scan.discard'), style: 'destructive', onPress: finish },
    ]);

  return (
    <Screen
      title={t('scan.reviewTitle')}
      subtitle={t('scan.reviewSubtitle')}
      footer={
        <>
          {counts.pending > 0 ? (
            <AppText tone="muted" style={styles.center}>
              {t('scan.pendingLeft', { count: counts.pending })}
            </AppText>
          ) : (
            <AppText tone="success" style={styles.center}>
              {t('scan.finishBody', { count: confirmed })}
            </AppText>
          )}
          <Button
            testID="scan-finish"
            label={counts.pending > 0 && confirmed === 0 ? t('scan.discard') : t('scan.finish')}
            variant={counts.pending > 0 ? 'secondary' : 'primary'}
            icon="checkmark-done"
            onPress={counts.pending > 0 && confirmed === 0 ? discard : finish}
          />
        </>
      }>
      {!SCAN_ACCURACY_GATE_PASSED ? <Banner tone="warning" title={t('scan.warningTitle')} body={t('scan.warningBody')} /> : null}

      {STUDY_MODE ? (
        <Button label="Export OCR for accuracy study" variant="soft" icon="share-outline" onPress={() => exportOcrForStudy(session.scanId, session.lines)} />
      ) : null}

      {candidates.length === 0 ? (
        <Banner tone="info" title={t('scan.noneRecognised')} body={t('scan.noneRecognisedBody')} />
      ) : null}

      {candidates.map((cand, i) => (
        <CandidateCard
          key={cand.id}
          candidate={cand}
          state={session.items[cand.id] ?? { status: 'pending', edited: false }}
          index={i}
          total={candidates.length}
        />
      ))}

      {unrecognised.length > 0 ? (
        <>
          <SectionTitle>{t('scan.unrecognisedTitle')}</SectionTitle>
          <Card tone="alt">
            <AppText tone="muted">{t('scan.unrecognisedBody')}</AppText>
            {unrecognised.map((line, i) => (
              <View key={`${i}-${line}`}>
                <Divider />
                <AppText style={styles.line} selectable>
                  {line}
                </AppText>
              </View>
            ))}
            <Button label={t('scan.addThisByTyping')} variant="secondary" icon="create" onPress={() => router.push('/medicine/new')} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function frequencyText(f: FrequencyInterpretation, t: (k: string, o?: Record<string, unknown>) => string): string {
  return f.kind === 'known' ? t(`frequency.${f.preset}`) : t('scan.unclear');
}

function CandidateCard({ candidate, state, index, total }: { candidate: Candidate; state: ItemState; index: number; total: number }) {
  const { t } = useTranslation();
  const f = candidate.frequency;
  const slots = f.kind === 'known' && f.slots ? f.slots.map((s) => `${t(`slots.${s.slot}`)} ${formatQuantity(s.quantity)}`).join(', ') : null;
  const done = state.status !== 'pending';

  return (
    <Card style={done ? { opacity: 0.75 } : undefined}>
      <View style={styles.head}>
        <AppText variant="overline" tone="muted" style={styles.flex}>
          {t('scan.candidateN', { n: index + 1, total })}
        </AppText>
        {state.status === 'confirmed' ? <Badge tone="success" icon="checkmark-circle" label={t('scan.confirmed')} /> : null}
        {state.status === 'removed' ? <Badge tone="neutral" icon="close-circle" label={t('scan.removed')} /> : null}
      </View>

      <SourceText text={candidate.sourceText} />

      <Row label={t('scan.matchedName')} value={catalogDisplayName(candidate.match.entry)} />
      <Row label={t('scan.strength')} value={candidate.strength?.text ?? t('scan.notFound')} warn={!candidate.strength} />
      <Row label={t('scan.frequency')} value={frequencyText(f, t)} warn={f.kind === 'unclear'} />
      <Row label={t('scan.times')} value={f.kind === 'known' && f.preset === 'as_needed' ? '—' : t('scan.timesNeeded')} />
      {slots ? <AppText variant="caption" tone="muted">{t('scan.slots', { slots })}</AppText> : null}

      {state.status === 'pending' ? (
        <View style={styles.actions}>
          <Button
            testID={`confirm-${candidate.id}`}
            label={t('scan.confirm')}
            icon="checkmark"
            onPress={() => router.push({ pathname: '/scan/confirm/[id]', params: { id: candidate.id, mode: 'confirm' } })}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label={t('scan.editAndConfirm')}
                variant="secondary"
                icon="create-outline"
                compact
                onPress={() => router.push({ pathname: '/scan/confirm/[id]', params: { id: candidate.id, mode: 'edit' } })}
              />
            </View>
            <View style={styles.flex}>
              <Button label={t('scan.remove')} variant="danger" icon="trash-outline" compact onPress={() => updateItem(candidate.id, { status: 'removed' })} />
            </View>
          </View>
        </View>
      ) : state.status === 'removed' ? (
        <Button label={t('scan.undo')} variant="ghost" compact onPress={() => updateItem(candidate.id, { status: 'pending' })} />
      ) : null}
    </Card>
  );
}

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" tone={warn ? 'warning' : 'default'} style={[styles.flex, styles.right]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  line: { paddingVertical: spacing.xs },
});
