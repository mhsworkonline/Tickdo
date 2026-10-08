import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { clock } from '@/domain/clock';
import type { MedicineInput } from '@/data/repositories';
import { addDays, format12h, istDateKey } from '@/domain/time';
import { FREQUENCY_PRESETS, MEDICINE_FORMS, type MedicineForm } from '@/domain/types';
import { catalogDisplayName, getCatalog, type CatalogEntry } from '@/features/catalog/catalog';
import { slotsForPreset, validateDraft, type DraftResult, type MedicineDraft } from '@/features/medicines/draft';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Badge, Banner, Card, ChoiceChips, Divider, PillIcon, Stepper, TextField } from '@/ui/components';
import { formatQuantity } from '@/ui/format';
import { Screen } from '@/ui/Screen';
import { radius, spacing } from '@/ui/theme';
import { TimePickerButton } from '@/ui/TimePickerButton';
import { useColors } from '@/ui/use-colors';

type Props = {
  title: string;
  initial: MedicineDraft;
  /** Prescription text this medicine came from; shown next to the fields for comparison. */
  sourceText?: string | null;
  /** Shown above the form (e.g. scan accuracy warning). */
  notice?: React.ReactNode;
  onConfirm: (input: MedicineInput) => Promise<void>;
};

const FORM_MAP: Record<string, MedicineForm> = {
  tablet: 'tablet',
  tab: 'tablet',
  capsule: 'capsule',
  cap: 'capsule',
  syrup: 'syrup',
  suspension: 'syrup',
  drops: 'drops',
  injection: 'injection',
  cream: 'cream',
  ointment: 'cream',
  gel: 'cream',
  inhaler: 'inhaler',
};

/**
 * Two steps: edit, then review. Nothing is saved until the user presses Confirm on the review.
 */
export function MedicineEditor({ title, initial, sourceText, notice, onConfirm }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const [draft, setDraft] = useState<MedicineDraft>(initial);
  const [query, setQuery] = useState(initial.name);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [today] = useState(() => istDateKey(clock.now()));
  const catalog = getCatalog();
  const matches = useMemo(() => (showResults ? catalog.search(query) : []), [catalog, query, showResults]);

  const set = (patch: Partial<MedicineDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setResult(null);
  };

  const pickEntry = (e: CatalogEntry) => {
    const name = catalogDisplayName(e);
    setQuery(name);
    setShowResults(false);
    const form = e.form ? FORM_MAP[e.form.toLowerCase()] : undefined;
    set({ name, catalogId: e.id, strength: draft.strength || e.strength || '', ...(form ? { form } : {}) });
  };

  const errors = result && !result.ok ? result.errors : {};
  const errText = (k: keyof typeof errors) => {
    const e = errors[k];
    return e ? t(e.key, { count: e.count ?? 1 }) : null;
  };

  const review = () => {
    const r = validateDraft(draft);
    setResult(r);
    if (r.ok) setReviewing(true);
  };

  if (reviewing && result?.ok) {
    const input = result.input;
    return (
      <Screen
        back={false}
        title={t('form.reviewTitle')}
        subtitle={t('form.reviewBody')}
        footer={
          <>
            <Button
              testID="confirm-medicine"
              label={input.frequency === 'as_needed' ? t('form.confirmSaveAsNeeded') : t('form.confirmSave')}
              icon="checkmark-circle"
              loading={saving}
              onPress={async () => {
                setSaving(true);
                try {
                  await onConfirm(input);
                } finally {
                  setSaving(false);
                }
              }}
            />
            <Button label={t('common.edit')} variant="ghost" icon="create-outline" onPress={() => setReviewing(false)} />
          </>
        }>
        {sourceText ? <SourceText text={sourceText} /> : null}
        <Card>
          <View style={styles.row}>
            <PillIcon form={input.form} color={0} />
            <View style={styles.flex}>
              <AppText variant="title">{input.name}</AppText>
              {input.catalogId === null ? <Badge tone="warning" icon="information-circle" label={t('form.notInListShort')} /> : null}
            </View>
          </View>
          <Divider />
          <ReviewRow label={t('form.strength')} value={input.strength ?? '—'} />
          <ReviewRow label={t('form.type')} value={t(`formLabels.${input.form}`)} />
          <ReviewRow label={t('form.frequency')} value={t(`frequency.${input.frequency}`)} />
          {input.times.map((tm, i) => (
            <ReviewRow
              key={tm.minutes}
              label={t('form.timeN', { n: i + 1 })}
              value={`${format12h(tm.minutes)} · ${formatQuantity(tm.quantity)} ${t(`forms.${input.form}`)}`}
            />
          ))}
          <ReviewRow label={t('form.stock')} value={input.unitsOnHand === null ? '—' : formatQuantity(input.unitsOnHand)} />
          <ReviewRow
            label={t('form.startDate')}
            value={input.startDate === today ? t('form.today') : input.startDate}
          />
        </Card>
        {input.frequency === 'as_needed' ? <Banner tone="info" title={t('form.asNeededNote')} /> : null}
      </Screen>
    );
  }


  return (
    <Screen
      back
      backLabel={t('common.back')}
      title={title}
      footer={<Button testID="review-medicine" label={t('form.review')} icon="eye" onPress={review} />}>
      {notice}
      {sourceText ? <SourceText text={sourceText} /> : null}

      <View style={styles.section}>
        <TextField
          testID="medicine-name"
          label={t('form.name')}
          placeholder={t('form.namePlaceholder')}
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            setShowResults(true);
            set({ name: v, catalogId: null });
          }}
          error={errText('name')}
          autoCorrect={false}
        />
        {catalog.size === 0 ? (
          <AppText variant="caption" tone="muted">
            {t('form.listEmpty')}
          </AppText>
        ) : null}
        {matches.length > 0 ? (
          <Card style={styles.results}>
            {matches.map((m) => (
              <Pressable
                key={m.entry.id}
                accessibilityRole="button"
                accessibilityLabel={catalogDisplayName(m.entry)}
                onPress={() => pickEntry(m.entry)}
                style={({ pressed }) => [styles.result, { backgroundColor: pressed ? c.primarySoft : 'transparent' }]}>
                <Ionicons name="medical-outline" size={20} color={c.primary} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{catalogDisplayName(m.entry)}</AppText>
                  {m.entry.strength || m.entry.form ? (
                    <AppText variant="caption" tone="muted">
                      {[m.entry.strength, m.entry.form].filter(Boolean).join(' · ')}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowResults(false)}
              style={({ pressed }) => [styles.result, { backgroundColor: pressed ? c.primarySoft : 'transparent' }]}>
              <Ionicons name="create-outline" size={20} color={c.textMuted} />
              <AppText>{t('form.useTyped', { name: query.trim() })}</AppText>
            </Pressable>
          </Card>
        ) : null}
        {draft.name.trim() && draft.catalogId === null && catalog.size > 0 && !showResults ? (
          <AppText variant="caption" tone="warning">
            {t('form.notInList')}
          </AppText>
        ) : null}
        {draft.catalogId ? <Badge tone="success" icon="checkmark-circle" label={t('form.fromList')} /> : null}
      </View>

      <TextField
        label={t('form.strength')}
        placeholder={t('form.strengthPlaceholder')}
        helper={t('form.strengthHelp')}
        value={draft.strength}
        onChangeText={(v) => set({ strength: v })}
        autoCorrect={false}
      />

      <View style={styles.section}>
        <AppText variant="label">{t('form.type')}</AppText>
        <ChoiceChips
          label={t('form.type')}
          options={MEDICINE_FORMS.map((f) => ({ value: f, label: t(`formLabels.${f}`) }))}
          value={draft.form}
          onChange={(form) => set({ form })}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="label">{t('form.frequency')}</AppText>
        <ChoiceChips
          label={t('form.frequency')}
          options={FREQUENCY_PRESETS.map((f) => ({ value: f, label: t(`frequency.${f}`) }))}
          value={draft.frequency}
          onChange={(frequency) => set({ frequency, slots: slotsForPreset(frequency, draft.slots) })}
        />
        {errText('frequency') ? (
          <AppText variant="caption" tone="danger">
            {errText('frequency')}
          </AppText>
        ) : null}
      </View>

      {draft.frequency === 'as_needed' ? <Banner tone="info" title={t('form.asNeededNote')} /> : null}

      {draft.frequency && draft.frequency !== 'as_needed' ? (
        <View style={styles.section}>
          <AppText variant="label">{t('form.times')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('form.timesHelp')}
          </AppText>
          {draft.slots.map((slot, i) => (
            <Card key={i} tone="alt" style={styles.slot}>
              <View style={styles.slotHead}>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {t('form.timeN', { n: i + 1 })}
                </AppText>
                {draft.frequency === 'custom' && draft.slots.length > 1 ? (
                  <Button
                    label={t('form.removeTime')}
                    variant="ghost"
                    compact
                    icon="trash-outline"
                    onPress={() => set({ slots: draft.slots.filter((_, j) => j !== i) })}
                  />
                ) : null}
              </View>
              <TimePickerButton
                value={slot.minutes}
                placeholder={t('form.pickTime')}
                accessibilityLabel={t('form.timeN', { n: i + 1 })}
                onChange={(minutes) => set({ slots: draft.slots.map((s, j) => (j === i ? { ...s, minutes } : s)) })}
              />
              <View style={styles.slotHead}>
                <AppText style={styles.flex}>{t('form.quantity')}</AppText>
                <Stepper
                  label={t('form.quantity')}
                  value={slot.quantity}
                  onChange={(quantity) => set({ slots: draft.slots.map((s, j) => (j === i ? { ...s, quantity } : s)) })}
                />
              </View>
            </Card>
          ))}
          {draft.frequency === 'custom' ? (
            <Button
              label={t('form.addTime')}
              variant="soft"
              icon="add"
              onPress={() => set({ slots: [...draft.slots, { minutes: null, quantity: 1 }] })}
            />
          ) : null}
          {errText('times') ? (
            <AppText variant="caption" tone="danger">
              {errText('times')}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <TextField
        label={`${t('form.stock')} (${t('common.optional')})`}
        placeholder={t('form.stockPlaceholder')}
        helper={t('form.stockHelp')}
        value={draft.unitsOnHand}
        onChangeText={(v) => set({ unitsOnHand: v })}
        keyboardType="decimal-pad"
        error={errText('stock')}
      />

      <View style={styles.section}>
        <AppText variant="label">{t('form.startDate')}</AppText>
        <ChoiceChips
          label={t('form.startDate')}
          options={[
            ...(draft.startDate < today ? [{ value: draft.startDate, label: draft.startDate }] : []),
            { value: today, label: t('form.today') },
            { value: addDays(today, 1), label: t('form.tomorrow') },
          ]}
          value={draft.startDate}
          onChange={(startDate) => set({ startDate })}
        />
      </View>
    </Screen>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <AppText tone="muted" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={[styles.flex, { textAlign: 'right' }]}>
        {value}
      </AppText>
    </View>
  );
}

/** The exact text read from the photo, so the user can compare against the paper. */
export function SourceText({ text }: { text: string }) {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <View style={[styles.source, { backgroundColor: c.surfaceAlt, borderColor: c.borderStrong }]}>
      <View style={styles.row}>
        <Ionicons name="document-text-outline" size={20} color={c.textMuted} />
        <AppText variant="overline" tone="muted">
          {t('detail.scanText').toUpperCase()}
        </AppText>
      </View>
      <AppText variant="bodyStrong" style={styles.mono} selectable>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  results: { padding: spacing.xs, gap: 0 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  slot: { gap: spacing.sm },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
  source: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  mono: { letterSpacing: 0.3 },
});
