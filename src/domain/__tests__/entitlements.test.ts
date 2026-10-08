import { canAddMedicine, canAddProfile, canUseCaregiverSharing, canUseRefillAlerts } from '@/domain/entitlements';

describe('entitlements', () => {
  it('free tier allows 3 medicines and 1 profile', () => {
    expect(canAddMedicine('free', 2)).toBe(true);
    expect(canAddMedicine('free', 3)).toBe(false);
    expect(canAddProfile('free', 0)).toBe(true);
    expect(canAddProfile('free', 1)).toBe(false);
  });

  it('plus is unlimited and unlocks caregiver + refill alerts', () => {
    expect(canAddMedicine('plus', 500)).toBe(true);
    expect(canUseCaregiverSharing('plus')).toBe(true);
    expect(canUseRefillAlerts('plus')).toBe(true);
    expect(canUseCaregiverSharing('free')).toBe(false);
    expect(canUseRefillAlerts('free')).toBe(false);
  });
});
