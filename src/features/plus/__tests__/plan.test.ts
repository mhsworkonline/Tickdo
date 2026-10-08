import { planFromEntitlements } from '@/features/plus/purchases';

// jest.mock calls are hoisted above the import by babel-jest.
jest.mock('react-native-purchases', () => ({ __esModule: true, default: {} }));
jest.mock('@/data/database', () => ({ openDatabase: jest.fn() }));
jest.mock('@/services/steps', () => ({ KV_PLAN: 'plan.current' }));

describe('planFromEntitlements', () => {
  it('plus entitlement grants Plus', () => {
    expect(planFromEntitlements(['plus'])).toBe('plus');
    expect(planFromEntitlements(['other', 'plus'])).toBe('plus');
  });

  it('anything else is Free', () => {
    expect(planFromEntitlements([])).toBe('free');
    expect(planFromEntitlements(['pro', 'legacy'])).toBe('free');
  });
});
