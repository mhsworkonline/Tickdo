import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Native from 'tickdo-native';

import { getCatalog } from '@/features/catalog/catalog';
import { SCAN_ACCURACY_GATE_PASSED } from '@/features/scan/config';
import { parsePrescription } from '@/features/scan/parser';
import { deletePhoto, processPhoto } from '@/features/scan/pipeline';
import { startSession } from '@/features/scan/session';
import { useServices } from '@/services/AppServices';
import { AppText } from '@/ui/AppText';
import { Button, IconButton } from '@/ui/Button';
import { Banner, Card, EmptyState } from '@/ui/components';
import { Screen } from '@/ui/Screen';
import { radius, spacing } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

type Phase = { kind: 'camera' } | { kind: 'working'; label: string } | { kind: 'retake'; reason: 'too_dark' | 'too_blurry' } | { kind: 'empty' };

export default function ScanCapture() {
  const { t } = useTranslation();
  const c = useColors();
  const { repos } = useServices();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });

  if (!permission) return <Screen back>{null}</Screen>;

  if (!permission.granted) {
    return (
      <Screen back backLabel={t('common.back')} title={t('scan.title')}>
        <Card>
          <EmptyState
            icon="camera"
            title={t('scan.permissionTitle')}
            body={t('scan.permissionBody')}
            action={
              permission.canAskAgain ? (
                <Button label={t('scan.permissionAction')} icon="camera" onPress={requestPermission} />
              ) : (
                <Button label={t('scan.permissionSettings')} icon="settings" onPress={() => Native.openAppSettings()} />
              )
            }
          />
        </Card>
        <Button label={t('scan.typeInstead')} variant="secondary" icon="create" onPress={() => router.replace('/medicine/new')} />
      </Screen>
    );
  }

  const capture = async () => {
    if (!camera.current || !ready) return;
    setPhase({ kind: 'working', label: t('scan.checking') });
    let photoUri: string | null = null;
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.9 });
      setPhase({ kind: 'working', label: t('scan.reading') });
      const outcome = await processPhoto(pic.uri);
      if (outcome.kind === 'retake') {
        setPhase({ kind: 'retake', reason: outcome.reason });
        return;
      }
      photoUri = outcome.photo.uri;
      const result = parsePrescription(outcome.lines, getCatalog());
      const scanId = await repos.scans.create(photoUri);
      if (result.nothingUsable) {
        await repos.scans.markFailed(scanId);
        deletePhoto(photoUri);
        await repos.scans.markPhotoDeleted(scanId);
        setPhase({ kind: 'empty' });
        return;
      }
      await repos.scans.setResult(scanId, outcome.lines.length, result.candidates.length);
      startSession({ scanId, photoUri, result, lines: outcome.lines });
      router.replace('/scan/review');
    } catch {
      deletePhoto(photoUri);
      setPhase({ kind: 'empty' });
    }
  };

  if (phase.kind === 'retake' || phase.kind === 'empty') {
    return (
      <Screen back backLabel={t('common.back')} title={t('scan.title')}>
        <Card>
          <EmptyState
            icon={phase.kind === 'retake' ? (phase.reason === 'too_dark' ? 'moon' : 'aperture') : 'document-text'}
            title={
              phase.kind === 'retake' ? (phase.reason === 'too_dark' ? t('scan.tooDark') : t('scan.tooBlurry')) : t('scan.nothingFound')
            }
            body={phase.kind === 'empty' ? t('scan.nothingFoundBody') : t('scan.captureHint')}
            action={<Button label={t('scan.retake')} icon="camera" onPress={() => setPhase({ kind: 'camera' })} />}
          />
        </Card>
        <Button label={t('scan.typeInstead')} variant="secondary" icon="create" onPress={() => router.replace('/medicine/new')} />
      </Screen>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />
        <IconButton
          icon={torch ? 'flashlight' : 'flashlight-outline'}
          label={torch ? t('scan.flashOff') : t('scan.flashOn')}
          onPress={() => setTorch((v) => !v)}
        />
      </View>
      {!SCAN_ACCURACY_GATE_PASSED ? (
        <View style={styles.banner}>
          <Banner tone="warning" title={t('scan.warningTitle')} body={t('scan.warningBody')} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} onCameraReady={() => setReady(true)} />
        <View pointerEvents="none" style={[styles.frame, { borderColor: c.accent }]} />
        {phase.kind === 'working' ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <AppText variant="subtitle" style={styles.white}>
              {phase.label}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.bottom}>
        <AppText style={[styles.white, styles.center]}>{t('scan.captureHint')}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('scan.capture')}
          disabled={!ready || phase.kind === 'working'}
          onPress={capture}
          style={({ pressed }) => [styles.shutter, { borderColor: c.accent, opacity: pressed || !ready ? 0.6 : 1 }]}>
          <Ionicons name="camera" size={36} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  banner: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  frame: { position: 'absolute', top: '6%', bottom: '6%', left: '6%', right: '6%', borderWidth: 3, borderRadius: radius.md },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  white: { color: '#fff' },
  center: { textAlign: 'center' },
  bottom: { padding: spacing.md, alignItems: 'center', gap: spacing.md },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, backgroundColor: '#0F5E57', alignItems: 'center', justifyContent: 'center' },
});
