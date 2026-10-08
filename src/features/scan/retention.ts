import { DAY_MS } from '@/domain/time';

/** Prescription photos are kept at most this long, even if the user never finishes the review. */
export const PHOTO_MAX_AGE_MS = 7 * DAY_MS;

/**
 * Pure: which scan photos must be deleted now — those whose review is finished (all items
 * confirmed or removed), and any older than 7 days regardless of state.
 */
export function photosToDelete(
  scans: readonly { id: string; createdAt: number; photoUri: string | null; status: string }[],
  now: number,
): { id: string; photoUri: string }[] {
  return scans
    .filter((s): s is typeof s & { photoUri: string } => s.photoUri !== null)
    .filter((s) => s.status === 'done' || s.status === 'failed' || now - s.createdAt >= PHOTO_MAX_AGE_MS)
    .map((s) => ({ id: s.id, photoUri: s.photoUri }));
}
