import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import * as Native from 'tickdo-native';

import { SCAN_PHOTO_DIR } from '@/features/account/delete-all';
import { base64ToBytes } from '@/features/scan/base64';
import { CHECK_WIDTH, judgeQuality, toGray } from '@/features/scan/quality';
import type { OcrLineInput } from '@/features/scan/parser';

/** Width the photo is reduced to before OCR (enough for prescription text, keeps files small). */
const OCR_WIDTH = 1600;

export type PreparedPhoto = { uri: string };

export type ProcessOutcome =
  | { kind: 'retake'; reason: 'too_dark' | 'too_blurry' }
  | { kind: 'ok'; photo: PreparedPhoto; lines: OcrLineInput[] };

function photoDir(): Directory {
  const dir = new Directory(Paths.document, SCAN_PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function deletePhoto(uri: string | null | undefined) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}

const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * Camera photo → app-private compressed copy → quality check → on-device OCR.
 * The original camera file is deleted; only the private copy remains until the review ends.
 * Nothing leaves the phone.
 */
export async function processPhoto(cameraUri: string): Promise<ProcessOutcome> {
  const resized = await ImageManipulator.manipulate(cameraUri).resize({ width: OCR_WIDTH }).renderAsync();
  const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  deletePhoto(cameraUri);

  const target = new File(photoDir(), `${Date.now()}.jpg`);
  await new File(saved.uri).move(target);

  const small = await ImageManipulator.manipulate(target.uri).resize({ width: CHECK_WIDTH }).renderAsync();
  const check = await small.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });
  deletePhoto(check.uri);
  const raw = decode(base64ToBytes(check.base64 ?? ''), { useTArray: true, formatAsRGBA: true });
  const verdict = judgeQuality(toGray(raw.width, raw.height, raw.data));
  if (!verdict.ok) {
    deletePhoto(target.uri);
    return { kind: 'retake', reason: verdict.reason };
  }

  const latin = await Native.recognizeText(target.uri, 'latin');
  // The Devanagari model is used only to capture Hindi lines for display as "not recognised".
  const hindi = await Native.recognizeText(target.uri, 'devanagari').catch(() => null);
  const lines: OcrLineInput[] = [
    ...latin.lines,
    ...(hindi?.lines.filter((l) => DEVANAGARI.test(l.text)) ?? []),
  ].map(({ text, left, top, width, height }) => ({ text, left, top, width, height }));

  return { kind: 'ok', photo: { uri: target.uri }, lines };
}
