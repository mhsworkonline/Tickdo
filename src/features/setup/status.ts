import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Native from 'tickdo-native';

import { batteryBrand, type BatteryBrand } from '@/features/setup/brand';

export type SetupStatus = {
  notifications: boolean;
  exactAlarms: boolean;
  /** true when the phone is not battery-optimising Tickdo */
  battery: boolean;
  brand: BatteryBrand;
  manufacturer: string;
  /** Android API level, or null elsewhere */
  apiLevel: number | null;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const perm = await Notifications.getPermissionsAsync();
  const manufacturer = Native.manufacturer() || Device.manufacturer || '';
  return {
    notifications: perm.granted,
    exactAlarms: Native.canScheduleExactAlarms(),
    battery: Native.isIgnoringBatteryOptimizations(),
    brand: batteryBrand(manufacturer),
    manufacturer,
    apiLevel: Platform.OS === 'android' ? (Device.platformApiLevel ?? null) : null,
  };
}

/** Required for reminders to work at all / on time. Battery is strongly recommended but not blocking. */
export function setupComplete(s: SetupStatus): boolean {
  return s.notifications && s.exactAlarms;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    Native.openNotificationSettings();
    return false;
  }
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}
