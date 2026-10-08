import { doseStatus } from '@/domain/dose-status';
import { generateDoses } from '@/domain/schedule';
import { DAY_MS } from '@/domain/time';
import type { DoseEvent, Medicine } from '@/domain/types';

/** Window of doses kept on the server while sharing is on. Future doses let the server detect
 * lateness even if the patient's phone is off. */
export const SHARE_PAST_MS = 2 * DAY_MS;
export const SHARE_FUTURE_MS = 2 * DAY_MS;

export type SharedDose = {
  dose_key: string;
  medicine_label: string;
  scheduled_at: string;
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  recorded_at: string | null;
};

/**
 * Pure: the rows to share with the caregiver. Contains only the medicine label, time and status
 * (no stock, notes, scan text). As-needed doses the user logged are included as taken.
 */
export function buildSharedDoses(medicines: readonly Medicine[], events: readonly DoseEvent[], now: number): SharedDose[] {
  const byId = new Map(medicines.map((m) => [m.id, m]));
  const label = (m: Medicine) => [m.name, m.strength].filter(Boolean).join(' ').slice(0, 120);
  const rows: SharedDose[] = [];

  for (const d of generateDoses(medicines, now - SHARE_PAST_MS, now + SHARE_FUTURE_MS)) {
    const m = byId.get(d.medicineId);
    if (!m) continue;
    const r = doseStatus(d, events, now);
    const status = r.status === 'taken' || r.status === 'skipped' || r.status === 'missed' ? r.status : 'pending';
    rows.push({
      dose_key: d.key,
      medicine_label: label(m),
      scheduled_at: new Date(d.scheduledAt).toISOString(),
      status,
      recorded_at: r.recordedAt ? new Date(r.recordedAt).toISOString() : null,
    });
  }

  for (const e of events) {
    const m = byId.get(e.medicineId);
    if (!m || m.frequency !== 'as_needed' || e.kind !== 'taken' || e.scheduledAt < now - SHARE_PAST_MS) continue;
    rows.push({
      dose_key: `${e.medicineId}@${e.scheduledAt}`,
      medicine_label: label(m),
      scheduled_at: new Date(e.scheduledAt).toISOString(),
      status: 'taken',
      recorded_at: new Date(e.recordedAt).toISOString(),
    });
  }
  return rows.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}
