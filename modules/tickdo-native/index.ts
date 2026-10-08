import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type OcrLine = {
  text: string;
  block: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** 0..1 from ML Kit, or -1 when not reported. */
  confidence: number;
};

export type OcrResult = { width: number; height: number; lines: OcrLine[] };
export type OcrScript = 'latin' | 'devanagari';

type NativeModuleShape = {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  openBatteryOptimizationSettings(): boolean;
  openAppSettings(): boolean;
  openNotificationSettings(): boolean;
  openAutostartSettings(): boolean;
  manufacturer(): string;
  recognizeText(uri: string, script: OcrScript): Promise<OcrResult>;
};

// Optional so Jest and Expo Go do not crash; callers get safe defaults.
const Native = requireOptionalNativeModule<NativeModuleShape>('TickdoNative');

export const isAvailable = Native !== null;

export function canScheduleExactAlarms(): boolean {
  return Native?.canScheduleExactAlarms() ?? true;
}
export function openExactAlarmSettings(): boolean {
  return Native?.openExactAlarmSettings() ?? false;
}
export function isIgnoringBatteryOptimizations(): boolean {
  return Platform.OS !== 'android' || (Native?.isIgnoringBatteryOptimizations() ?? true);
}
export function openBatteryOptimizationSettings(): boolean {
  return Native?.openBatteryOptimizationSettings() ?? false;
}
export function openAppSettings(): boolean {
  return Native?.openAppSettings() ?? false;
}
export function openNotificationSettings(): boolean {
  return Native?.openNotificationSettings() ?? false;
}
export function openAutostartSettings(): boolean {
  return Native?.openAutostartSettings() ?? false;
}
export function manufacturer(): string {
  return Native?.manufacturer() ?? '';
}
export async function recognizeText(uri: string, script: OcrScript = 'latin'): Promise<OcrResult> {
  if (!Native) throw new Error('On-device text recognition is not available in this build.');
  return Native.recognizeText(uri, script);
}
