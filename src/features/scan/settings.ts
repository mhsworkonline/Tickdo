import { useCallback } from 'react';

import { useLoad, useServices } from '@/services/AppServices';

const KV_SCAN_ENABLED = 'scan.enabled';

/**
 * Prescription scanning can be turned off in Settings. Manual entry always works.
 * Until the accuracy gate is passed, the scan screens also show a "check against your
 * prescription" warning (see docs/accuracy-report.md).
 */
export function useScanSettings(): { enabled: boolean; setEnabled: (v: boolean) => Promise<void> } {
  const { repos, changed } = useServices();
  const stored = useLoad((s) => s.repos.kv.get(KV_SCAN_ENABLED));
  const setEnabled = useCallback(
    async (v: boolean) => {
      await repos.kv.set(KV_SCAN_ENABLED, v ? '1' : '0');
      changed();
    },
    [repos, changed],
  );
  return { enabled: stored !== '0', setEnabled };
}
