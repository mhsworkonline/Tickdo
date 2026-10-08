import type { DoseEvent, Medicine } from '@/domain/types';

export function makeMedicine(overrides: Partial<Medicine> = {}): Medicine {
  return {
    id: 'med-1',
    profileId: 'profile-1',
    name: 'Test medicine',
    catalogId: null,
    strength: '500 mg',
    form: 'tablet',
    frequency: 'twice_daily',
    times: [
      { minutes: 8 * 60, quantity: 1 },
      { minutes: 20 * 60, quantity: 1 },
    ],
    unitsOnHand: null,
    active: true,
    startDate: '2026-01-01',
    source: 'manual',
    scanId: null,
    scanSourceText: null,
    scanConfirmedAt: null,
    color: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

let eventSeq = 0;
export function makeEvent(overrides: Partial<DoseEvent> & Pick<DoseEvent, 'kind' | 'scheduledAt'>): DoseEvent {
  eventSeq += 1;
  return {
    id: `evt-${eventSeq}`,
    medicineId: 'med-1',
    recordedAt: overrides.scheduledAt,
    snoozeUntil: null,
    via: 'app',
    ...overrides,
  };
}
