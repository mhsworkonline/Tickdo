import { useFocusEffect } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { clock } from '@/domain/clock';
import type { Repositories } from '@/data/repositories';
import type { Plan } from '@/domain/entitlements';
import { initBilling } from '@/features/plus/purchases';
import { runMaintenance } from '@/services/maintenance';

type Services = {
  repos: Repositories;
  profileId: string;
  plan: Plan;
  setPlan: (plan: Plan) => void;
  /** Increments after every data change; screens reload when it changes. */
  version: number;
  /** Call after any write: refreshes screens and re-plans reminders. */
  changed: () => void;
};

const ServicesContext = createContext<Services | null>(null);

export function AppServicesProvider({
  repos,
  profileId,
  initialPlan,
  children,
}: {
  repos: Repositories;
  profileId: string;
  initialPlan: Plan;
  children: ReactNode;
}) {
  const [version, setVersion] = useState(0);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changed = useCallback(() => {
    setVersion((v) => v + 1);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      runMaintenance().catch(() => undefined);
    }, 300);
  }, []);

  // Plan follows RevenueCat (purchase, renewal, expiry). Works offline from the cached value.
  useEffect(() => {
    let stop: (() => void) | null = null;
    initBilling(setPlan)
      .then((s) => {
        stop = s;
      })
      .catch(() => undefined);
    return () => stop?.();
  }, []);

  // Re-plan whenever the app comes back to the foreground (time has passed, statuses changed).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') changed();
    });
    return () => sub.remove();
  }, [changed]);

  const value = useMemo(() => ({ repos, profileId, plan, setPlan, version, changed }), [repos, profileId, plan, version, changed]);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside AppServicesProvider');
  return ctx;
}

/**
 * Loads data and reloads it when the screen gains focus or any data changes.
 * `null` while the first load is in progress.
 */
export function useLoad<T>(load: (s: Services) => Promise<T>, deps: DependencyList = []): T | null {
  const services = useServices();
  const [data, setData] = useState<T | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((n) => n + 1);
    }, []),
  );
  useEffect(() => {
    let cancelled = false;
    load(services).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on data version, focus and caller deps
  }, [services.version, focusTick, ...deps]);
  return data;
}

/** Re-renders every `ms` so time-based statuses (due → missed) stay current. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const id = setInterval(() => setNow(clock.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
