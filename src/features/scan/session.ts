import { useSyncExternalStore } from 'react';

import type { OcrLineInput, ParseResult } from '@/features/scan/parser';

export type ItemState = { status: 'pending' | 'confirmed' | 'removed'; edited: boolean };

export type ScanSession = {
  scanId: string;
  photoUri: string;
  result: ParseResult;
  /** Raw OCR lines, kept only for the accuracy-study export. */
  lines: OcrLineInput[];
  items: Record<string, ItemState>;
};

/**
 * The scan being reviewed, kept in memory only (never in navigation params or logs, because it
 * contains prescription text). Cleared when the review finishes or is discarded.
 */
let current: ScanSession | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function startSession(s: Omit<ScanSession, 'items'>) {
  current = {
    ...s,
    items: Object.fromEntries(s.result.candidates.map((c) => [c.id, { status: 'pending', edited: false } as ItemState])),
  };
  emit();
}

export function updateItem(id: string, patch: Partial<ItemState>) {
  if (!current?.items[id]) return;
  current = { ...current, items: { ...current.items, [id]: { ...current.items[id], ...patch } as ItemState } };
  emit();
}

export function endSession() {
  current = null;
  emit();
}

export function getSession(): ScanSession | null {
  return current;
}

export function useScanSession(): ScanSession | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function sessionCounts(s: ScanSession) {
  const items = Object.values(s.items);
  return {
    pending: items.filter((i) => i.status === 'pending').length,
    confirmedUnchanged: items.filter((i) => i.status === 'confirmed' && !i.edited).length,
    confirmedEdited: items.filter((i) => i.status === 'confirmed' && i.edited).length,
    removed: items.filter((i) => i.status === 'removed').length,
  };
}
