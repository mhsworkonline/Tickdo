import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { openDatabase } from '@/data/database';
import type { Plan } from '@/domain/entitlements';
import { KV_PLAN } from '@/services/steps';

/**
 * RevenueCat + Google Play Billing. Users are anonymous to RevenueCat (no phone, no account id)
 * and no health data is ever sent. Without an API key the app simply runs on the free plan.
 */
export const ENTITLEMENT_ID = 'plus';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const API_KEY = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

export const isBillingConfigured = API_KEY.length > 0;

/** Pure: which plan a set of active entitlement ids grants. */
export function planFromEntitlements(activeIds: readonly string[]): Plan {
  return activeIds.includes(ENTITLEMENT_ID) ? 'plus' : 'free';
}

function planOf(info: CustomerInfo): Plan {
  return planFromEntitlements(Object.keys(info.entitlements.active));
}

async function cache(plan: Plan) {
  const { repos } = await openDatabase();
  await repos.kv.set(KV_PLAN, plan);
}

let configured = false;

/** Configures RevenueCat once and reports plan changes (purchase, renewal, expiry, refund). */
export async function initBilling(onPlan: (plan: Plan) => void): Promise<() => void> {
  if (!isBillingConfigured) {
    onPlan('free');
    return () => undefined;
  }
  if (!configured) {
    Purchases.configure({ apiKey: API_KEY });
    configured = true;
  }
  const listener = (info: CustomerInfo) => {
    const plan = planOf(info);
    cache(plan).catch(() => undefined);
    onPlan(plan);
  };
  Purchases.addCustomerInfoUpdateListener(listener);
  try {
    listener(await Purchases.getCustomerInfo());
  } catch {
    // Offline: keep the last known plan from the cache.
    const { repos } = await openDatabase();
    onPlan((await repos.kv.get(KV_PLAN)) === 'plus' ? 'plus' : 'free');
  }
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!isBillingConfigured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'failed';

export async function buy(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return planOf(customerInfo) === 'plus' ? 'purchased' : 'failed';
  } catch (e) {
    return (e as { userCancelled?: boolean | null }).userCancelled ? 'cancelled' : 'failed';
  }
}

export async function restore(): Promise<Plan | null> {
  if (!isBillingConfigured) return null;
  try {
    return planOf(await Purchases.restorePurchases());
  } catch {
    return null;
  }
}
