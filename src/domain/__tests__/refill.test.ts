import { adjustStock, dailyUnits, daysRemaining, needsRefill } from '@/domain/refill';
import { makeMedicine } from '@/test-utils/factories';

describe('refill math', () => {
  it('daily units is the sum of entered quantities', () => {
    const med = makeMedicine({
      times: [
        { minutes: 480, quantity: 1 },
        { minutes: 1200, quantity: 0.5 },
      ],
    });
    expect(dailyUnits(med)).toBe(1.5);
  });

  it('as-needed has no daily usage and no days remaining', () => {
    const med = makeMedicine({ frequency: 'as_needed', times: [], unitsOnHand: 10 });
    expect(dailyUnits(med)).toBe(0);
    expect(daysRemaining(med)).toBeNull();
    expect(needsRefill(med)).toBe(false);
  });

  it('not tracking stock means no alert', () => {
    expect(daysRemaining(makeMedicine({ unitsOnHand: null }))).toBeNull();
    expect(needsRefill(makeMedicine({ unitsOnHand: null }))).toBe(false);
  });

  it('alerts when fewer than 3 days remain', () => {
    // twice daily, 1 each = 2/day
    expect(daysRemaining(makeMedicine({ unitsOnHand: 6 }))).toBe(3);
    expect(needsRefill(makeMedicine({ unitsOnHand: 6 }))).toBe(false);
    expect(daysRemaining(makeMedicine({ unitsOnHand: 5 }))).toBe(2);
    expect(needsRefill(makeMedicine({ unitsOnHand: 5 }))).toBe(true);
    expect(needsRefill(makeMedicine({ unitsOnHand: 0 }))).toBe(true);
  });

  it('inactive medicines never alert', () => {
    expect(needsRefill(makeMedicine({ unitsOnHand: 0, active: false }))).toBe(false);
  });

  it('adjustStock clamps at zero, handles halves, ignores untracked', () => {
    expect(adjustStock(10, -1)).toBe(9);
    expect(adjustStock(0.5, -1)).toBe(0);
    expect(adjustStock(1, -0.5)).toBe(0.5);
    expect(adjustStock(9, 1)).toBe(10);
    expect(adjustStock(null, -1)).toBeNull();
  });
});
