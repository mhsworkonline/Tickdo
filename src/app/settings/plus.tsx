import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { buy, getPackages, isBillingConfigured, restore } from '@/features/plus/purchases';
import { useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Banner, Card, ChoiceChips } from '@/ui/components';
import { Screen } from '@/ui/Screen';
import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

export default function PlusScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const { plan, setPlan } = useServices();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPackages()
      .then((p) => {
        if (cancelled) return;
        setPackages(p);
        setSelected(p[0]?.identifier ?? null);
      })
      .catch(() => {
        if (!cancelled) setPackages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const freeItems = t('plus.freeItems', { returnObjects: true }) as unknown as string[];
  const plusItems = t('plus.plusItems', { returnObjects: true }) as unknown as string[];
  const pkg = packages?.find((p) => p.identifier === selected) ?? null;

  return (
    <Screen
      back
      backLabel={t('common.back')}
      title={plan === 'plus' ? t('plus.activeTitle') : t('plus.title')}
      footer={
        plan === 'plus' ? undefined : (
          <>
            <Button
              testID="subscribe"
              label={t('plus.subscribe')}
              icon="star"
              disabled={!pkg}
              loading={busy}
              onPress={async () => {
                if (!pkg) return;
                setBusy(true);
                const outcome = await buy(pkg);
                setBusy(false);
                if (outcome === 'purchased') setPlan('plus');
                else if (outcome === 'failed') setMessage(t('plus.unavailable'));
              }}
            />
            <Button
              label={t('plus.restore')}
              variant="ghost"
              onPress={async () => {
                const restored = await restore();
                if (restored === 'plus') {
                  setPlan('plus');
                  setMessage(t('plus.restored'));
                } else setMessage(restored === null ? t('plus.unavailable') : t('plus.nothingToRestore'));
              }}
            />
          </>
        )
      }>
      <Card tone="primary" style={styles.hero}>
        <View style={[styles.star, { backgroundColor: c.accent }]}>
          <Ionicons name="star" size={36} color="#3A2200" />
        </View>
        <AppText variant="title" tone="onPrimary">
          {plan === 'plus' ? t('plus.activeBody') : t('plus.headline')}
        </AppText>
      </Card>

      <View style={styles.columns}>
        <Card style={styles.col}>
          <AppText variant="subtitle">{t('plus.free')}</AppText>
          {freeItems.map((i) => (
            <Item key={i} text={i} included={false} />
          ))}
        </Card>
        <Card style={[styles.col, { borderColor: c.primary, borderWidth: 2 }]}>
          <AppText variant="subtitle" tone="primary">
            Plus
          </AppText>
          {plusItems.map((i) => (
            <Item key={i} text={i} included />
          ))}
        </Card>
      </View>

      <Banner tone="info" icon="alarm" title={t('plus.reminderFree')} />

      {plan !== 'plus' ? (
        !isBillingConfigured ? (
          <Banner tone="warning" title={t('plus.notConfigured')} />
        ) : packages && packages.length > 0 ? (
          <Card>
            <ChoiceChips
              label={t('plus.title')}
              options={packages.map((p) => ({ value: p.identifier, label: `${p.product.title.replace(/\s*\(.*\)$/, '')} · ${p.product.priceString}` }))}
              value={selected}
              onChange={setSelected}
            />
            <AppText variant="caption" tone="muted">
              {t('plus.terms')}
            </AppText>
          </Card>
        ) : packages ? (
          <Banner tone="warning" title={t('plus.unavailable')} />
        ) : null
      ) : null}

      {message ? <AppText tone="primary">{message}</AppText> : null}
    </Screen>
  );
}

function Item({ text, included }: { text: string; included: boolean }) {
  const c = useColors();
  return (
    <View style={styles.item}>
      <Ionicons name={included ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={included ? c.success : c.textMuted} />
      <AppText style={styles.flex}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.lg },
  star: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  columns: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 150 },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
