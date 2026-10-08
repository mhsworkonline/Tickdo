import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { OcrLineInput } from '@/features/scan/parser';

/**
 * Accuracy-study builds only (EXPO_PUBLIC_ACCURACY_STUDY=1, eas.json "study" profile).
 * Lets study staff export the OCR lines of a consented test prescription as ocr.json for
 * labelling. Never enabled in production builds; nothing is uploaded automatically.
 */
export const STUDY_MODE = process.env.EXPO_PUBLIC_ACCURACY_STUDY === '1';

export async function exportOcrForStudy(scanId: string, lines: readonly OcrLineInput[]): Promise<void> {
  if (!STUDY_MODE) return;
  const file = new File(Paths.cache, `ocr-${scanId}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify({ lines }, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
}
