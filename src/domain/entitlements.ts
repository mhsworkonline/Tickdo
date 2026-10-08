/** Free vs paid ("Tickdo Plus") limits. Core reminders are never paywalled. */
export const FREE_MEDICINE_LIMIT = 3;
export const FREE_PROFILE_LIMIT = 1;

export type Plan = 'free' | 'plus';

export function canAddMedicine(plan: Plan, activeMedicineCount: number): boolean {
  return plan === 'plus' || activeMedicineCount < FREE_MEDICINE_LIMIT;
}

export function canAddProfile(plan: Plan, profileCount: number): boolean {
  return plan === 'plus' || profileCount < FREE_PROFILE_LIMIT;
}

export function canUseCaregiverSharing(plan: Plan): boolean {
  return plan === 'plus';
}

export function canUseRefillAlerts(plan: Plan): boolean {
  return plan === 'plus';
}
